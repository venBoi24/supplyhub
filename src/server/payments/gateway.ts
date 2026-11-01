import "server-only";

import { LynxPayClient } from "./lynxpay/client";
import type { PaymentGateway } from "./types";

export function getPaymentGateway(): PaymentGateway {
  return new LynxPayClient();
}
