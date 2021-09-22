const Wildcard = require('wildcard');

import { Parse } from '../parser/Hostname.Parser';
import { IncomingMessage } from "http";
import { MagicProxyDefinition } from "../../index";

export function matchDomain(proxy: MagicProxyDefinition, req: IncomingMessage){
  const domain = String(proxy.domain).toUpperCase();
  const hostname = String(Parse(req)).toUpperCase();
  return Wildcard(domain, hostname);
}