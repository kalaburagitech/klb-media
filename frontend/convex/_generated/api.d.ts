/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_mediaTypes from "../lib/mediaTypes.js";
import type * as lib_processingConfig from "../lib/processingConfig.js";
import type * as lib_r2Client from "../lib/r2Client.js";
import type * as lib_r2Config from "../lib/r2Config.js";
import type * as media from "../media.js";
import type * as processing from "../processing.js";
import type * as r2Actions from "../r2Actions.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  http: typeof http;
  "lib/mediaTypes": typeof lib_mediaTypes;
  "lib/processingConfig": typeof lib_processingConfig;
  "lib/r2Client": typeof lib_r2Client;
  "lib/r2Config": typeof lib_r2Config;
  media: typeof media;
  processing: typeof processing;
  r2Actions: typeof r2Actions;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
