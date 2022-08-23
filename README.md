# scim-api-server
> This is a sample NodeJS SCIM API service

## Table of Contents
1. [Installation](#installation)
1. [Local dev setup](#local-dev-setup)
1. [Supports](#supports)
1. [References](#references)

### Installation
- Install Node.js
  - Node.js is a prerequisite and have to be installed on the server.

### Local dev setup
#### Prerequisite
- [ngrok](https://ngrok.com/) to put localhost on the internet
- Create a `.env` file or copy over the `.env.local` file and update the following information
  - Update database url, since its using sqlite. You can put `file:./dev.db`
  - authorization should be `username:password` that is configured at the IDP scim integration level

### Supports
- Okta

### References
- [System for Cross-domain Identity Management: Protocol](https://www.rfc-editor.org/rfc/rfc7644)
- [SCIM](https://developer.okta.com/docs/concepts/scim/)
- [SCIM Protocol Overview](https://developer.okta.com/docs/reference/scim/)
- [Build a SCIM provisioning integration overview](https://developer.okta.com/docs/guides/scim-provisioning-integration-overview/main/)
