/**
 * The harness surface this plugin consumes, declared structurally.
 *
 * The gate imports nothing at runtime — not `@deepseek-ai/*`, not a schema
 * library, not a utility package. For a plugin whose entire job is to reduce
 * supply-chain surface, shipping a dependency tree to do it would undercut the
 * claim, and it would make the gate itself a supply-chain risk.
 *
 * The cost of that choice is this file: the parts of the Cordis context and the
 * tool registry the gate touches, written as minimal structural interfaces. They
 * are *structural* on purpose — the harness's real objects satisfy them by
 * shape, and a harness revision that adds fields keeps working, while a revision
 * that removes one fails at compile time here rather than at runtime in a user's
 * session.
 *
 * @module dsh-security-gate/dsh
 */

import type { JsonValue } from './types.js';

/** A registration's disposer. */
export type Disposer = () => void;

/** One content block in a tool result. */
export interface ContentBlock {
  type: string;
  text?: string;
  [key: string]: unknown;
}

/** JSON Schema, as accepted by the tool registry. */
export type JsonSchema = Record<string, unknown>;

/** The execution record a tool body receives. */
export interface ToolExecutionLike {
  /** Tool name. */
  name: string;
  /** Correlating call id assigned by the registry. */
  callId: string;
  /** Arguments, frozen by the registry once validation has run. */
  arguments?: unknown;
  /** Owning agent, absent for agent-less dispatches. */
  agent?: unknown;
  /** Cancellation signal for the call. */
  signal?: AbortSignal;
}

/** A tool definition, exactly the shape `defineTool` produces. */
export interface ToolDefinitionLike {
  name: string;
  description: string;
  /** JSON Schema for the arguments. */
  parameters: JsonSchema;
  output: {
    /** JSON Schema for the returned value. */
    schema: JsonSchema;
    /** Project the returned value into model-facing content blocks. */
    render: (args: never, value: never) => ContentBlock[];
    /** Optional replayable projection of the returned value. */
    presentationMeta?: (args: never, value: never) => unknown;
  };
  /** Cooperative timeout budget in milliseconds. */
  timeoutMs?: number;
  execute: (args: never, exec: ToolExecutionLike) => unknown;
  /** Optional pending-call presentation. */
  presentCall?: (args: never) => unknown;
  /** Optional settled-call presentation. */
  presentResult?: (args: never, result: unknown) => unknown;
}

/** The tool registry seam. */
export interface ToolRegistryLike {
  register: (definition: ToolDefinitionLike) => Disposer;
}

/** One slash-command invocation. */
export interface CommandInvocationLike {
  /** Everything the user typed after the command name. */
  rawInput: string;
  agent?: unknown;
  signal?: AbortSignal;
}

/** A command's settled outcome. */
export type CommandResultLike =
  | { kind: 'success'; text: string }
  | { kind: 'error'; text: string };

/** The command registry seam. */
export interface CommandRegistryLike {
  register: (command: {
    name: string;
    description: string;
    input?: { hint?: string };
    handler: (invocation: CommandInvocationLike) => Promise<CommandResultLike> | CommandResultLike;
  }) => Disposer;
}

/** The system-prompt seam. */
export interface SystemPromptLike {
  section: (section: { name: string; order: number; text: string }) => Disposer;
}

/** The logger seam. */
export interface LoggerLike {
  warn: (message: string) => void;
  error: (message: string) => void;
  info?: (message: string) => void;
}

/** The pre-execute decision a guard returns. */
export type PreToolDecision =
  | { kind: 'allow' }
  | { kind: 'deny'; reason: string }
  | { kind: 'ask'; reason?: string };

/** The post-execute decision an output auditor returns. */
export type PostToolDecision =
  | { kind: 'accept'; content?: ContentBlock[]; additionalContexts?: unknown[] }
  | { kind: 'block'; feedback: ContentBlock[] };

/** Context options accepted by {@link GateContext.on}. */
export interface ListenerOptions {
  /** Run this listener before listeners already registered. */
  prepend?: boolean;
  /** Receive the event regardless of the dispatching scope's filter. */
  global?: boolean;
}

/**
 * The Cordis context, as far as the gate is concerned.
 *
 * `tools` is required because both layers hook the tool pipeline; `commands` and
 * `systemPrompt` are optional so a deployment that composes neither still gets a
 * working gate.
 */
export interface GateContext {
  tools: ToolRegistryLike;
  commands?: CommandRegistryLike;
  systemPrompt?: SystemPromptLike;
  logger?: LoggerLike;
  /** Register a listener; the returned disposer unregisters it. */
  on: (event: string, listener: (...args: never[]) => unknown, options?: ListenerOptions) => Disposer;
  /** Register a fiber-scoped effect; the returned disposer runs it. */
  effect: (callback: () => Disposer | void, label?: string) => Disposer;
  /** Look an optional service up without requiring it. */
  get: (name: string) => unknown;
  /**
   * Run `callback` against a context that has the named services, composing them
   * into the fiber only once they exist. Used for the optional surfaces, so the
   * gate never refuses to load because a command registry is absent.
   */
  inject?: (names: string[], callback: (ctx: GateContext) => void) => void;
}

/** The `tools/pre-execute` listener signature. */
export type PreExecuteListener = (
  exec: ToolExecutionLike,
  next: () => Promise<PreToolDecision>,
) => Promise<PreToolDecision>;

/** The `tools/post-execute` listener signature. */
export type PostExecuteListener = (
  exec: ToolExecutionLike,
  result: { content: ContentBlock[]; isError: boolean; value?: unknown },
  next: () => Promise<PostToolDecision>,
) => Promise<PostToolDecision>;

/** Narrow a value to a JSON object for argument inspection. */
export function asJsonValue(value: unknown): JsonValue {
  if (value === undefined) return null;
  try {
    return JSON.parse(JSON.stringify(value)) as JsonValue;
  } catch {
    return null;
  }
}
