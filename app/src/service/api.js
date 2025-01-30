import fetch, { Response } from "node-fetch";
import { Helper } from "../utils/helper.js";
import { HttpsProxyAgent } from "https-proxy-agent";
import logger from "../utils/logger.js";

export class API {
  constructor(proxy) {
    if (proxy && proxy.length > 0) {
      this.proxy = proxy;
    }
    this.ua = Helper.randomUserAgent();
  }

  getHeaders(token, additionalHeaders) {
    let headers = {
      Accept: "application/json",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "cors",
      "User-Agent": this.ua,
    };
    if (token) {
      headers['mgo-token'] = token;
    }
    if (additionalHeaders) {
      Object.assign(headers, additionalHeaders);
    }
    return headers;
  }

  async request(url, method = "GET", body, token, additionalHeaders) {
    const options = {
      method,
      headers: this.getHeaders(token, additionalHeaders),
      body: body ? JSON.stringify(body) : undefined,
      agent: this.proxy ? new HttpsProxyAgent(this.proxy) : undefined,
    };

    try {
      logger.info(`${method} ${url} ${this.proxy ? this.proxy : ""}`);
      logger.info(`Request Headers: ${JSON.stringify(options.headers)}`);
      logger.info(`Request Body: ${JSON.stringify(options.body)}`);

      const response = await fetch(url, options);

      if (!response.ok) {
        throw response;
      }

      const status = response.status;
      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      logger.info(`Response Status: ${response.status} ${response.statusText}`);
      logger.info(`Response Data: ${JSON.stringify(data)}`);

      return { status, data };
    } catch (error) {
      if (error instanceof Response) {
        const status = error.status;
        const contentType = error.headers.get("content-type");
        let data;

        if (contentType && contentType.includes("application/json")) {
          data = await error.json();
        } else {
          data = { message: await error.text() };
        }

        logger.error(`Response Status: ${error.status} ${error.statusText}`);
        logger.error(`Response Data: ${JSON.stringify(data)}`);

        if (status === 403) {
          return { status, data };
        } else if (status === 500 || status === 404) {
          console.error("Server error, exiting...");
          process.exit(1);
        } else {
          throw new Error(`${status} ${error.statusText}`);
        }
      } else {
        throw new Error(`Request failed: ${error.message || error}`);
      }
    }
  }
}
