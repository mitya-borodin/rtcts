# base-code

The repository contains several libraries with reusable code on several projects.

## Setup local environment

1. Install node >= 10 <11, npm >= 6 <7;
2. Install rearguard, npm i -g rearguard;

## Deploy for development

1. rearguard monorepo --bootstrap --both

## Used in projects

### Concept (very simple)

- [concept-common](https://gitlab.com/concept-of-client-server-application/common),
- [concept-server](https://gitlab.com/concept-of-client-server-application/server),
- [concept-client](https://gitlab.com/concept-of-client-server-application/client),
- [concept-web-ui](https://gitlab.com/concept-of-client-server-application/web-ui).

### Home-tracker (have more code then Concept)

Right now it project not work, because not implemented adapter classes in [home-tracker-front-end](https://gitlab.com/home-tracker/front-end).

- [home-tracker-common](https://gitlab.com/home-tracker/external).
- [home-tracker-back-end](https://gitlab.com/home-tracker/back-end).
- [home-tracker-front-end](https://gitlab.com/home-tracker/front-end).
- [home-tracker-ui](https://gitlab.com/home-tracker/ui).

## Used technology

1. OOP
2. SOLID principles
3. Design patterns
4. [Rearguard](https://www.npmjs.com/package/rearguard);

## Project structure

```
├── package.json
└── packages
    ├── ant-design-vendor
    ├── back
    ├── common-vendor
    ├── deferred_module_test
    ├── front
    ├── interfaces
    ├── isomorphic
    ├── mobx-vendor
    ├── react-vendor
    └── utils
```

- ant-design-vendor - contains all atnd dependencies which will be loaded as [DLL](https://webpack.js.org/plugins/dll-plugin/).
- back - contains reusable code for implement back-end on nodejs.
- common-vendor - contains common dependencies which will be loaded as [DLL](https://webpack.js.org/plugins/dll-plugin/).
  -deferred_module_test - this package demonstrate how we can build library for load on demand in target project like a [code-splitting](https://webpack.js.org/guides/code-splitting/#root), but webpack do not touch files from this package.
- front - contains reusable code (Repository, Transport, Filters, ...) for implement front-end application.
- interfaces - contains interfaces which we will use without implementation.
- isomorphic - contains reusable code between client and server.
- mobx-vendor - contains mobx dependencies which will be loaded as [DLL](https://webpack.js.org/plugins/dll-plugin/).
- react-vendor - contains react dependencies which will be loaded as [DLL](https://webpack.js.org/plugins/dll-plugin/).
- utils - contains util functions for different work types.
