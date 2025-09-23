import { randomBytes } from "crypto";
export const makeToken = () => randomBytes(18).toString("base64url");
