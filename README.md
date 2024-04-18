# Summary

| Product          | Site Mapper API                                                                                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Description      | Node.JS app that provides API end points to return dynamic site maps for the Validator website and the Datastore website.                          |
| Website          | [https://validator.iatistandard.org](https://validator.iatistandard.org), [https://datastore.iatistandard.org](https://datastore.iatistandard.org) |
| Related          | [IATI/validator-web](https://github.com/IATI/validator-web), [IATI/datastore-search](https://github.com/IATI/datastore-search)                     |
| Documentation    | [https://developer.iatistandard.org/](https://developer.iatistandard.org/)                                                                         |
| Technical Issues | https://github.com/IATI/sitemapper/issues                                                                                                          |
| Support          | https://iatistandard.org/en/guidance/get-support/                                                                                                  |

# sitemapper

Azure Function app to produce custom XML sitemaps for the IATI Validator (where the sitemap includes a link to each publisher's overview page) and the IATI Datastore (where a sitemap index is produced, and multiple sitemaps which include links to each activity's page on the Datastore).

## Endpoints

See OpenAPI specification `postman/schemas/index.yaml`. To view locally in Swagger UI, you can use the `42crunch.vscode-openapi` VSCode extension.

## Prerequisities

-   nvm - [nvm](https://github.com/nvm-sh/nvm) - Node version manager
-   Node LTS
    -   This will be the latest LTS version supported by Azure Functions, set in `.nvmrc`
    -   once you've installed nvm run `nvm use` which will look at `.nvmrc` for the node version, if it's not installed then it will prompt you to install it with `nvm install <version> --latest-npm`
-   npm >=8
    -   nvm will install the version of npm packaged with node. make sure to use the `--latest-npm` flag to get the latest version
    -   If you forgot to do that install the latest version of npm with `npm i -g npm`
-   [Azure Functions Core Tools v3](https://github.com/Azure/azure-functions-core-tools)
-   [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli) version 2.4 or later.

## Getting Started

1. Run `npm i`
1. Run `npm start` to run the function locally using the Azure Functions Core Tools

## Environment Variables

### Set Up

`cp .env.example .env`

### Adding New

Add in:

1. .env.example
1. .env
1. `/config/config.js`

Import

```
import config from './config/config.js';

let myEnvVariable = config.ENV_VAR
```

## Attached Debugging (VSCode)

-   Set a breakpoint
-   Press F5 to start the Azure Function and Attach the VSCode debugger
    -   Configuration is contained in `.vscode/launch.json` and `.vscode/tasks.json`
-   Trigger a request that will hit your break point
-   Enojy!

## Linting and Code Formatting

### Prerequisities

-   To show linting inline install [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) for VSCode

### Info

-   This is done with eslint following the airbnb-base style and using [Prettier](https://prettier.io). Implemented with [this](https://sourcelevel.io/blog/how-to-setup-eslint-and-prettier-on-node) guide.
-   If you use VSCode the formatting will happen automagically on save due to the `.vscode/settings.json` > `"editor.formatOnSave": true` setting

## Creating a new route

`func new --name <routename> --template "HTTP trigger" --authlevel "anonymous"`

## Integration Tests

### Running

-   Install newman globally `npm i -g newman`
-   Start function `npm start`
-   Run Tests `npm test`

### Modifying/Adding

Integration tests are written in Postman v2.1 format and run with newman
Import the `integrations-tests/azure-function-node-microservice-template.postman_collection.json` into Postman and write additional tests there
