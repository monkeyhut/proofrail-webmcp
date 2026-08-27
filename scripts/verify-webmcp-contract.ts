import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const sourcePaths = {
  app: resolve(repoRoot, "app", "proofrail-app.tsx"),
  releaseReadiness: resolve(repoRoot, "app", "release-readiness.tsx"),
  domain: resolve(repoRoot, "lib", "proofrail.ts"),
  domainVerification: resolve(repoRoot, "scripts", "verify-domain.ts"),
} as const;

const allowedToolNames = [
  "get_review_context",
  "replace_review_packet",
  "attach_evidence",
  "stage_resolution_batch",
  "verify_release_gate",
  "export_proof_receipt",
] as const;

type SourceKey = keyof typeof sourcePaths;
type ParsedSource = {
  text: string;
  file: ts.SourceFile;
};

function readSource(key: SourceKey): ParsedSource {
  const path = sourcePaths[key];
  let text: string;

  try {
    text = readFileSync(path, "utf8");
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`WEBMCP_CONTRACT_SOURCE_MISSING: ${path}: ${detail}`);
  }

  return {
    text,
    file: ts.createSourceFile(
      path,
      text,
      ts.ScriptTarget.Latest,
      true,
      path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
  };
}

const sources = {
  app: readSource("app"),
  releaseReadiness: readSource("releaseReadiness"),
  domain: readSource("domain"),
  domainVerification: readSource("domainVerification"),
};

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function collectNodes<T extends ts.Node>(
  root: ts.Node,
  guard: (node: ts.Node) => node is T,
): T[] {
  const matches: T[] = [];

  function visit(node: ts.Node) {
    if (guard(node)) matches.push(node);
    ts.forEachChild(node, visit);
  }

  visit(root);
  return matches;
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression;

  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }

  return current;
}

function propertyNameText(name: ts.PropertyName | ts.BindingName): string | null {
  if (
    ts.isIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name)
  ) {
    return name.text;
  }
  return null;
}

function getObjectProperty(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.PropertyAssignment | undefined {
  return object.properties.find(
    (property): property is ts.PropertyAssignment =>
      ts.isPropertyAssignment(property) && propertyNameText(property.name) === name,
  );
}

function getArrayVariable(
  source: ts.SourceFile,
  name: string,
): ts.ArrayLiteralExpression[] {
  return collectNodes(source, ts.isVariableDeclaration)
    .filter(
      (declaration) =>
        ts.isIdentifier(declaration.name) && declaration.name.text === name,
    )
    .map((declaration) => declaration.initializer)
    .filter((initializer): initializer is ts.Expression => Boolean(initializer))
    .map(unwrapExpression)
    .filter(ts.isArrayLiteralExpression);
}

function literalString(expression: ts.Expression): string | null {
  const unwrapped = unwrapExpression(expression);
  return ts.isStringLiteralLike(unwrapped) ? unwrapped.text : null;
}

function objectArrayElements(
  array: ts.ArrayLiteralExpression,
  label: string,
): ts.ObjectLiteralExpression[] {
  const objects = array.elements
    .map(unwrapExpression)
    .filter(ts.isObjectLiteralExpression);
  invariant(
    objects.length === array.elements.length,
    `${label} must contain only explicit object literals; spreads and dynamic entries are forbidden.`,
  );
  return objects;
}

function toolName(tool: ts.ObjectLiteralExpression): string {
  const name = getObjectProperty(tool, "name");
  invariant(name, "Every registered WebMCP tool must have an explicit name property.");
  const value = literalString(name.initializer);
  invariant(value, "Every registered WebMCP tool name must be a string literal.");
  return value;
}

function calleeTerminalName(expression: ts.LeftHandSideExpression): string | null {
  const unwrapped = unwrapExpression(expression);
  if (ts.isIdentifier(unwrapped)) return unwrapped.text;
  if (ts.isPropertyAccessExpression(unwrapped)) return unwrapped.name.text;
  if (
    ts.isElementAccessExpression(unwrapped) &&
    unwrapped.argumentExpression &&
    ts.isStringLiteralLike(unwrapped.argumentExpression)
  ) {
    return unwrapped.argumentExpression.text;
  }
  return null;
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function requireExactNames(actual: readonly string[], label: string) {
  const expected = sorted(allowedToolNames);
  const normalized = sorted(actual);
  invariant(
    new Set(actual).size === actual.length,
    `${label} contains duplicate tool names: ${actual.join(", ")}.`,
  );
  invariant(
    normalized.length === expected.length &&
      normalized.every((name, index) => name === expected[index]),
    `${label} must contain exactly ${allowedToolNames.join(", ")}; found ${actual.join(", ") || "none"}.`,
  );
}

function findAncestor<T extends ts.Node>(
  node: ts.Node,
  guard: (candidate: ts.Node) => candidate is T,
): T | undefined {
  let current = node.parent;
  while (current) {
    if (guard(current)) return current;
    current = current.parent;
  }
  return undefined;
}

function functionLikeInitializer(
  property: ts.PropertyAssignment,
  label: string,
): ts.ArrowFunction | ts.FunctionExpression {
  const initializer = unwrapExpression(property.initializer);
  invariant(
    ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer),
    `${label} must use an explicit function body; indirect execute aliases are not auditable.`,
  );
  return initializer;
}

function collectSchemaInputKeys(schema: ts.ObjectLiteralExpression): string[] {
  const keys: string[] = [];

  function visitSchema(node: ts.ObjectLiteralExpression) {
    const properties = getObjectProperty(node, "properties");
    if (properties) {
      const initializer = unwrapExpression(properties.initializer);
      invariant(
        ts.isObjectLiteralExpression(initializer),
        "WebMCP inputSchema.properties must be an explicit object literal.",
      );
      for (const property of initializer.properties) {
        invariant(
          ts.isPropertyAssignment(property),
          "WebMCP schema properties may not use spreads, methods, or computed aliases.",
        );
        const key = propertyNameText(property.name);
        invariant(key, "WebMCP schema property names must be static.");
        keys.push(key);
      }
    }

    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property)) continue;
      const initializer = unwrapExpression(property.initializer);
      if (ts.isObjectLiteralExpression(initializer)) visitSchema(initializer);
      if (ts.isArrayLiteralExpression(initializer)) {
        for (const element of initializer.elements) {
          const candidate = unwrapExpression(element);
          if (ts.isObjectLiteralExpression(candidate)) visitSchema(candidate);
        }
      }
    }
  }

  visitSchema(schema);
  return keys;
}

function normalizedIdentifierTokens(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function hasHumanAuthorityToken(value: string): boolean {
  const tokens = normalizedIdentifierTokens(value);
  return tokens.some((token) =>
    ["approve", "approval", "decide", "decision", "publish", "release"].includes(
      token,
    ),
  );
}

const toolArrays = getArrayVariable(sources.app.file, "tools");
invariant(
  toolArrays.length === 1,
  `Expected one explicit runtime WebMCP tools array; found ${toolArrays.length}.`,
);
const registeredTools = objectArrayElements(toolArrays[0], "Runtime WebMCP tools");
const registeredToolNames = registeredTools.map(toolName);
requireExactNames(registeredToolNames, "Runtime WebMCP registration");

const registrationCalls = collectNodes(sources.app.file, ts.isCallExpression).filter(
  (call) => calleeTerminalName(call.expression) === "registerTool",
);
invariant(
  registrationCalls.length === 1,
  `Expected one auditable registerTool loop call; found ${registrationCalls.length}.`,
);
const registrationCall = registrationCalls[0];
invariant(
  registrationCall.parent && ts.isAwaitExpression(registrationCall.parent),
  "registerTool must be awaited so registration failures surface before agent-ready state.",
);
invariant(
  registrationCall.arguments.length >= 1 &&
    ts.isIdentifier(unwrapExpression(registrationCall.arguments[0])) &&
    (unwrapExpression(registrationCall.arguments[0]) as ts.Identifier).text === "tool",
  "registerTool must receive the audited tool object from the runtime tools array.",
);
const registrationLoop = findAncestor(registrationCall, ts.isForOfStatement);
invariant(registrationLoop, "registerTool must run inside an explicit for-of loop.");
const registrationIterable = unwrapExpression(registrationLoop.expression);
invariant(
  ts.isIdentifier(registrationIterable) && registrationIterable.text === "tools",
  "registerTool must iterate the audited runtime tools array.",
);
invariant(
  ts.isVariableDeclarationList(registrationLoop.initializer),
  "The registration loop initializer must be an explicit variable declaration.",
);
const loopDeclarations = registrationLoop.initializer.declarations;
invariant(
  loopDeclarations.length === 1 &&
    ts.isIdentifier(loopDeclarations[0].name) &&
    loopDeclarations[0].name.text === "tool",
  "The registration loop must bind each runtime entry as tool.",
);

const manifestArrays = getArrayVariable(sources.app.file, "toolManifest");
invariant(
  manifestArrays.length === 1,
  `Expected one visible toolManifest; found ${manifestArrays.length}.`,
);
requireExactNames(
  objectArrayElements(manifestArrays[0], "Visible WebMCP manifest").map(toolName),
  "Visible WebMCP manifest",
);

for (const name of registeredToolNames) {
  if (name === "verify_release_gate") continue;
  invariant(
    !/approve|approval|decide|publish|release/i.test(name),
    `Forbidden authority-bearing WebMCP tool name: ${name}.`,
  );
}

const toolByName = new Map(
  registeredTools.map((tool) => [toolName(tool), tool] as const),
);

for (const [name, tool] of toolByName) {
  const schemaProperty = getObjectProperty(tool, "inputSchema");
  invariant(schemaProperty, `${name} must declare an explicit inputSchema.`);
  const schema = unwrapExpression(schemaProperty.initializer);
  invariant(
    ts.isObjectLiteralExpression(schema),
    `${name} inputSchema must be an explicit object literal.`,
  );

  const unsafeInputKeys = collectSchemaInputKeys(schema).filter(
    hasHumanAuthorityToken,
  );
  invariant(
    unsafeInputKeys.length === 0,
    `${name} exposes human/release authority through input fields: ${unsafeInputKeys.join(", ")}.`,
  );

  const executeProperty = getObjectProperty(tool, "execute");
  invariant(executeProperty, `${name} must have an explicit execute callback.`);
  const execute = functionLikeInitializer(executeProperty, `${name}.execute`);
  const executeCalls = collectNodes(execute.body, ts.isCallExpression)
    .map((call) => calleeTerminalName(call.expression))
    .filter((callName): callName is string => Boolean(callName));
  const unsafeCalls = executeCalls.filter(
    (callName) =>
      callName !== "verifyReleaseGate" && hasHumanAuthorityToken(callName),
  );
  invariant(
    unsafeCalls.length === 0,
    `${name}.execute calls authority-bearing functions: ${unsafeCalls.join(", ")}.`,
  );
}

const contextTool = toolByName.get("get_review_context");
invariant(contextTool, "get_review_context is missing from the registered tools.");
const contextExecuteProperty = getObjectProperty(contextTool, "execute");
invariant(contextExecuteProperty, "get_review_context must have an execute callback.");
const contextExecute = functionLikeInitializer(
  contextExecuteProperty,
  "get_review_context.execute",
);
invariant(
  collectNodes(contextExecute.body, ts.isCallExpression).some(
    (call) => calleeTerminalName(call.expression) === "reviewContextSnapshot",
  ),
  "get_review_context must return reviewContextSnapshot rather than a raw workspace/profile.",
);

const snapshotFunctions = collectNodes(
  sources.app.file,
  ts.isFunctionDeclaration,
).filter((declaration) => declaration.name?.text === "reviewContextSnapshot");
invariant(
  snapshotFunctions.length === 1 && snapshotFunctions[0].body,
  "Expected one concrete reviewContextSnapshot function.",
);
const snapshotFunction = snapshotFunctions[0];
invariant(snapshotFunction.body, "reviewContextSnapshot must have a function body.");
const snapshotBody = snapshotFunction.body;
const safeProfileDeclarations = collectNodes(
  snapshotBody,
  ts.isVariableDeclaration,
).filter(
  (declaration) =>
    ts.isIdentifier(declaration.name) &&
    declaration.name.text === "safePresentationProfile",
);
invariant(
  safeProfileDeclarations.length === 1 && safeProfileDeclarations[0].initializer,
  "reviewContextSnapshot must build one explicit safePresentationProfile projection.",
);
const safeProfile = unwrapExpression(safeProfileDeclarations[0].initializer);
invariant(
  ts.isObjectLiteralExpression(safeProfile),
  "safePresentationProfile must be an explicit object literal.",
);
const safeProfileSpreads = collectNodes(safeProfile, ts.isSpreadAssignment);
invariant(
  safeProfileSpreads.length === 0,
  "safePresentationProfile may not spread raw presentation data.",
);
const safeProfileKeys = safeProfile.properties
  .filter(ts.isPropertyAssignment)
  .map((property) => propertyNameText(property.name))
  .filter((name): name is string => Boolean(name));
const unsafeSnapshotKeys = collectNodes(
  snapshotBody,
  ts.isPropertyAssignment,
)
  .map((property) => propertyNameText(property.name))
  .filter((name): name is string => Boolean(name))
  .filter((name) => /hero.*(?:url|data)|data(?:url|uri)/i.test(name));
invariant(
  unsafeSnapshotKeys.length === 0,
  `reviewContextSnapshot exposes forbidden hero/data fields: ${unsafeSnapshotKeys.join(", ")}.`,
);
invariant(
  !collectNodes(snapshotBody, ts.isStringLiteralLike).some((literal) =>
    /^data:/i.test(literal.text.trim()),
  ),
  "reviewContextSnapshot contains a data URL literal.",
);
const safeProfileAllowedKeys = new Set([
  "brandName",
  "direction",
  "industry",
  "audience",
  "author",
  "publishedLabel",
  "ctaLabel",
  "subjectName",
  "heroAsset",
]);
invariant(
  safeProfileKeys.every((name) => safeProfileAllowedKeys.has(name)),
  `safePresentationProfile contains unapproved fields: ${safeProfileKeys
    .filter((name) => !safeProfileAllowedKeys.has(name))
    .join(", ")}.`,
);
const heroAssetProperty = getObjectProperty(safeProfile, "heroAsset");
if (heroAssetProperty) {
  const heroAsset = unwrapExpression(heroAssetProperty.initializer);
  invariant(
    ts.isObjectLiteralExpression(heroAsset),
    "safePresentationProfile.heroAsset must be a redacted metadata object.",
  );
  invariant(
    heroAsset.properties.every(
      (property) =>
        ts.isPropertyAssignment(property) &&
        ["present", "alt", "focalPoint"].includes(
          propertyNameText(property.name) ?? "",
        ),
    ),
    "safePresentationProfile.heroAsset may expose only present, alt, and focalPoint.",
  );
}
const snapshotReturns = collectNodes(snapshotBody, ts.isReturnStatement);
invariant(snapshotReturns.length === 1, "reviewContextSnapshot must have one return path.");
const snapshotReturn = snapshotReturns[0].expression
  ? unwrapExpression(snapshotReturns[0].expression)
  : undefined;
invariant(
  snapshotReturn && ts.isObjectLiteralExpression(snapshotReturn),
  "reviewContextSnapshot must return an explicit object literal.",
);
const returnedProfile = getObjectProperty(snapshotReturn, "presentationProfile");
invariant(
  returnedProfile &&
    ts.isIdentifier(unwrapExpression(returnedProfile.initializer)) &&
    (unwrapExpression(returnedProfile.initializer) as ts.Identifier).text ===
      "safePresentationProfile",
  "reviewContextSnapshot must return only safePresentationProfile.",
);

const releasePropsAliases = collectNodes(
  sources.releaseReadiness.file,
  ts.isTypeAliasDeclaration,
).filter((declaration) => declaration.name.text === "ReleaseReadinessProps");
invariant(
  releasePropsAliases.length === 1 &&
    ts.isTypeLiteralNode(releasePropsAliases[0].type),
  "ReleaseReadinessProps must be one explicit type literal.",
);
const releasePropNames = releasePropsAliases[0].type.members
  .filter(ts.isPropertySignature)
  .map((property) => propertyNameText(property.name))
  .filter((name): name is string => Boolean(name));
invariant(
  releasePropNames.includes("runReleaseCheck"),
  "ReleaseReadinessProps must require the injected runReleaseCheck callback.",
);

const releaseComponents = collectNodes(
  sources.releaseReadiness.file,
  ts.isFunctionDeclaration,
).filter((declaration) => declaration.name?.text === "ReleaseReadiness");
invariant(
  releaseComponents.length === 1 && releaseComponents[0].body,
  "Expected one concrete ReleaseReadiness component.",
);
const releaseComponent = releaseComponents[0];
invariant(releaseComponent.body, "ReleaseReadiness must have a component body.");
const releaseComponentBody = releaseComponent.body;
const releaseHandlers = collectNodes(
  releaseComponentBody,
  ts.isFunctionDeclaration,
).filter((declaration) => declaration.name?.text === "checkReleaseReadiness");
invariant(
  releaseHandlers.length === 1 && releaseHandlers[0].body,
  "ReleaseReadiness must have one concrete checkReleaseReadiness handler.",
);
const releaseHandler = releaseHandlers[0];
invariant(
  releaseHandler.body,
  "checkReleaseReadiness must have an explicit function body.",
);
const releaseHandlerBody = releaseHandler.body;
invariant(
  collectNodes(releaseHandlerBody, ts.isAwaitExpression).some((awaitExpression) => {
    const expression = unwrapExpression(awaitExpression.expression);
    return (
      ts.isCallExpression(expression) &&
      calleeTerminalName(expression.expression) === "runReleaseCheck" &&
      expression.arguments.length === 0
    );
  }),
  "checkReleaseReadiness must await the injected runReleaseCheck callback.",
);
invariant(
  collectNodes(releaseHandlerBody, ts.isCallExpression).some(
    (call) =>
      calleeTerminalName(call.expression) === "setGate" &&
      call.arguments.some(
        (argument) =>
          ts.isIdentifier(unwrapExpression(argument)) &&
          (unwrapExpression(argument) as ts.Identifier).text === "nextGate",
      ),
  ),
  "ReleaseReadiness must render the gate object returned by runReleaseCheck.",
);
const releaseButtons = collectNodes(
  releaseComponentBody,
  ts.isJsxOpeningElement,
).filter((element) => element.tagName.getText(sources.releaseReadiness.file) === "button");
const releaseSelfClosingButtons = collectNodes(
  releaseComponentBody,
  ts.isJsxSelfClosingElement,
).filter((element) => element.tagName.getText(sources.releaseReadiness.file) === "button");
const releaseButtonOpenings = [...releaseButtons, ...releaseSelfClosingButtons];
invariant(
  releaseButtonOpenings.some((button) => {
    const onClick = button.attributes.properties.find(
      (attribute): attribute is ts.JsxAttribute =>
        ts.isJsxAttribute(attribute) && attribute.name.getText() === "onClick",
    );
    if (!onClick?.initializer || !ts.isJsxExpression(onClick.initializer)) return false;
    if (!onClick.initializer.expression) return false;
    return collectNodes(onClick.initializer.expression, ts.isCallExpression).some(
      (call) => calleeTerminalName(call.expression) === "checkReleaseReadiness",
    );
  }),
  "The release-readiness button must invoke checkReleaseReadiness.",
);
const forbiddenTimerCalls = collectNodes(
  releaseComponentBody,
  ts.isCallExpression,
)
  .map((call) => calleeTerminalName(call.expression))
  .filter((name): name is string => Boolean(name))
  .filter((name) =>
    [
      "setTimeout",
      "setInterval",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "clearTimeout",
      "clearInterval",
    ].includes(name),
  );
invariant(
  forbiddenTimerCalls.length === 0,
  `ReleaseReadiness contains timer/animation calls: ${forbiddenTimerCalls.join(", ")}.`,
);

const releaseReadinessJsx = [
  ...collectNodes(sources.app.file, ts.isJsxOpeningElement),
  ...collectNodes(sources.app.file, ts.isJsxSelfClosingElement),
].filter((element) => element.tagName.getText(sources.app.file) === "ReleaseReadiness");
invariant(
  releaseReadinessJsx.length === 1,
  `Expected one ReleaseReadiness integration; found ${releaseReadinessJsx.length}.`,
);
const injectedGateAttribute = releaseReadinessJsx[0].attributes.properties.find(
  (attribute): attribute is ts.JsxAttribute =>
    ts.isJsxAttribute(attribute) && attribute.name.getText() === "runReleaseCheck",
);
invariant(
  injectedGateAttribute?.initializer &&
    ts.isJsxExpression(injectedGateAttribute.initializer) &&
    injectedGateAttribute.initializer.expression,
  "ReleaseReadiness must receive runReleaseCheck from the live workspace.",
);
const injectedGateCalls = collectNodes(
  injectedGateAttribute.initializer.expression,
  ts.isCallExpression,
).filter((call) => calleeTerminalName(call.expression) === "verifyReleaseGate");
invariant(
  injectedGateCalls.length === 1 &&
    injectedGateCalls[0].arguments.length === 1 &&
    injectedGateCalls[0].arguments[0].getText(sources.app.file) ===
      "workspaceRef.current",
  "runReleaseCheck must call verifyReleaseGate(workspaceRef.current) exactly once.",
);

function assertionCalls(method: "throws" | "rejects" | "equal") {
  return collectNodes(sources.domainVerification.file, ts.isCallExpression).filter(
    (call) =>
      ts.isPropertyAccessExpression(unwrapExpression(call.expression)) &&
      (unwrapExpression(call.expression) as ts.PropertyAccessExpression).expression.getText(
        sources.domainVerification.file,
      ) === "assert" &&
      (unwrapExpression(call.expression) as ts.PropertyAccessExpression).name.text ===
        method,
  );
}

function hasErrorAssertion(
  code: string,
  allowedMutationCalls: readonly string[],
): boolean {
  return [...assertionCalls("throws"), ...assertionCalls("rejects")].some(
    (assertion) => {
      if (assertion.arguments.length < 2) return false;
      const matcher = assertion.arguments[1].getText(sources.domainVerification.file);
      if (!matcher.includes(code)) return false;
      const calls = collectNodes(assertion.arguments[0], ts.isCallExpression)
        .map((call) => calleeTerminalName(call.expression))
        .filter((name): name is string => Boolean(name));
      return calls.some((name) => allowedMutationCalls.includes(name));
    },
  );
}

invariant(
  hasErrorAssertion("STALE_WORKSPACE", [
    "stageResolutionBatch",
    "attachEvidence",
    "replaceReviewPacket",
    "approveClaimEvidence",
    "decideProposal",
  ]),
  "verify-domain.ts must assert STALE_WORKSPACE from a concrete mutation call.",
);
invariant(
  hasErrorAssertion("STALE_CLAIM", [
    "stageResolutionBatch",
    "approveClaimEvidence",
    "decideProposal",
  ]),
  "verify-domain.ts must assert STALE_CLAIM from a concrete claim mutation call.",
);
invariant(
  hasErrorAssertion("STALE_PROPOSAL", ["decideProposal"]),
  "verify-domain.ts must assert STALE_PROPOSAL from decideProposal.",
);

const adverseWorkspaceDeclaration = collectNodes(
  sources.domainVerification.file,
  ts.isVariableDeclaration,
).find(
  (declaration) =>
    ts.isIdentifier(declaration.name) &&
    /adverse.*workspace/i.test(declaration.name.text) &&
    declaration.initializer &&
    collectNodes(declaration.initializer, ts.isCallExpression).some(
      (call) => calleeTerminalName(call.expression) === "structuredClone",
    ),
);
invariant(
  adverseWorkspaceDeclaration && ts.isIdentifier(adverseWorkspaceDeclaration.name),
  "verify-domain.ts must create an explicit cloned adverse resolved workspace.",
);
const adverseWorkspaceName = adverseWorkspaceDeclaration.name.text;
const adverseEdgeAssignments = collectNodes(
  sources.domainVerification.file,
  ts.isBinaryExpression,
).filter(
  (expression) =>
    expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
    expression.left.getText(sources.domainVerification.file) ===
      `${adverseWorkspaceName}.edges` &&
    /relation\s*:\s*["'](?:contradicts|outdated)["']/.test(
      expression.right.getText(sources.domainVerification.file),
    ),
);
invariant(
  adverseEdgeAssignments.length >= 1,
  "The adverse resolved workspace must replace a live evidence edge with contradicts or outdated.",
);
const adverseGateAssertion = assertionCalls("equal").some((assertion) => {
  const text = assertion.getText(sources.domainVerification.file);
  return (
    text.includes(`verifyReleaseGate(${adverseWorkspaceName})`) &&
    /["'](?:CONTRADICTED|OUTDATED)["']/.test(text)
  );
});
invariant(
  adverseGateAssertion,
  "verify-domain.ts must assert the exact adverse blocker on the resolved workspace.",
);
const adverseReceiptAssertion = assertionCalls("rejects").some((assertion) => {
  const text = assertion.getText(sources.domainVerification.file);
  return (
    text.includes(`createProofReceipt(${adverseWorkspaceName})`) &&
    text.includes("RELEASE_BLOCKED")
  );
});
invariant(
  adverseReceiptAssertion,
  "verify-domain.ts must prove the adverse resolved workspace cannot create a receipt.",
);

const receiptTypes = collectNodes(sources.domain.file, ts.isTypeAliasDeclaration).filter(
  (declaration) => declaration.name.text === "ProofReceipt",
);
invariant(
  receiptTypes.length === 1 && ts.isTypeLiteralNode(receiptTypes[0].type),
  "ProofReceipt must be one explicit type literal.",
);
const receiptFields = receiptTypes[0].type.members
  .filter(ts.isPropertySignature)
  .map((property) => propertyNameText(property.name))
  .filter((name): name is string => Boolean(name));
for (const field of [
  "publicationBrief",
  "sourceWorkspaceRevision",
  "generatedAt",
  "contentHash",
]) {
  invariant(receiptFields.includes(field), `ProofReceipt is missing required field ${field}.`);
}

const receiptFunctions = collectNodes(sources.domain.file, ts.isFunctionDeclaration).filter(
  (declaration) => declaration.name?.text === "createProofReceipt",
);
invariant(
  receiptFunctions.length === 1 && receiptFunctions[0].body,
  "Expected one concrete createProofReceipt implementation.",
);
const receiptFunction = receiptFunctions[0];
invariant(receiptFunction.body, "createProofReceipt must have a function body.");
const receiptFunctionBody = receiptFunction.body;
const proofContentDeclarations = collectNodes(
  receiptFunctionBody,
  ts.isVariableDeclaration,
).filter(
  (declaration) =>
    ts.isIdentifier(declaration.name) && declaration.name.text === "proofContent",
);
invariant(
  proofContentDeclarations.length === 1 && proofContentDeclarations[0].initializer,
  "createProofReceipt must build one explicit proofContent object.",
);
const proofContent = unwrapExpression(proofContentDeclarations[0].initializer);
invariant(
  ts.isObjectLiteralExpression(proofContent),
  "createProofReceipt proofContent must be an explicit object literal.",
);
const proofContentFields = proofContent.properties
  .map((property) =>
    "name" in property && property.name
      ? propertyNameText(property.name)
      : null,
  )
  .filter((name): name is string => Boolean(name));
for (const field of ["sourceWorkspaceRevision", "publicationBrief", "generatedAt"]) {
  invariant(
    proofContentFields.includes(field),
    `proofContent must hash ${field}.`,
  );
}
const contentHashDeclarations = collectNodes(
  receiptFunctionBody,
  ts.isVariableDeclaration,
).filter(
  (declaration) =>
    ts.isIdentifier(declaration.name) && declaration.name.text === "contentHash",
);
invariant(
  contentHashDeclarations.length === 1 && contentHashDeclarations[0].initializer,
  "createProofReceipt must compute one contentHash.",
);
const contentHashSource = contentHashDeclarations[0].initializer.getText(
  sources.domain.file,
);
invariant(
  /sha256Hex\s*\(\s*stableStringify\s*\(\s*proofContent\s*\)\s*\)/.test(
    contentHashSource,
  ),
  "contentHash must be SHA-256 over stableStringify(proofContent).",
);
const receiptReturns = collectNodes(receiptFunctionBody, ts.isReturnStatement)
  .filter(
    (statement) =>
      findAncestor(statement, ts.isFunctionLike) === receiptFunction,
  )
  .map((statement) => statement.expression)
  .filter((expression): expression is ts.Expression => Boolean(expression))
  .map(unwrapExpression)
  .filter(ts.isObjectLiteralExpression);
invariant(receiptReturns.length === 1, "createProofReceipt must return one receipt object.");
const receiptReturn = receiptReturns[0];
invariant(
  receiptReturn.properties.some(
    (property) =>
      (ts.isPropertyAssignment(property) &&
        propertyNameText(property.name) === "contentHash") ||
      (ts.isShorthandPropertyAssignment(property) &&
        property.name.text === "contentHash"),
  ),
  "createProofReceipt must return contentHash.",
);
invariant(
  receiptReturn.properties.some(
    (property) =>
      ts.isSpreadAssignment(property) &&
      ts.isIdentifier(unwrapExpression(property.expression)) &&
      (unwrapExpression(property.expression) as ts.Identifier).text === "proofContent",
  ),
  "createProofReceipt must return the hashed proofContent fields.",
);

const receiptVerificationText = sources.domainVerification.text;
invariant(
  /assert\.equal\(receipt\.sourceWorkspaceRevision,\s*workspace\.revision\)/.test(
    receiptVerificationText,
  ),
  "verify-domain.ts must assert the receipt's source workspace revision.",
);
invariant(
  /assert\.equal\(receipt\.publicationBrief\.publicationType,\s*["'][^"']+["']\)/.test(
    receiptVerificationText,
  ),
  "verify-domain.ts must assert receipt publicationBrief content.",
);
invariant(
  /assert\.notEqual\(changedBriefReceipt\.contentHash,\s*receipt\.contentHash\)/.test(
    receiptVerificationText,
  ),
  "verify-domain.ts must prove publicationBrief changes invalidate contentHash.",
);

console.log(
  JSON.stringify(
    {
      status: "pass",
      registeredTools: registeredToolNames,
      guarantees: [
        "exact-six-tool-registration",
        "no-agent-human-authority-input",
        "redacted-review-context-media",
        "real-timerless-release-readiness",
        "stale-and-adverse-domain-coverage",
        "publication-brief-revision-hash-receipt",
      ],
    },
    null,
    2,
  ),
);
