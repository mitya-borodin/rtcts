# @framework/isomorphic

Contains basic isomorphic abstractions and implementations of a framework that allows you to create a real-time client-server application.

## SimpleObject

- The basis of all created objects in the system.
- Declares two key methods toObject, toJSON.

## ValueObject

- Globally not unique and immutable.
- Contains the canBeInsert method, which allows you to check the object and make sure that it is composed correctly and can be inserted into the database for example.
- Contains the validate method, which allows you to get information about the fields that are correctly or incorrectly filled.
- It can be part of an entity and stored in a database, or it can be intermediate data, such as user registration form data, that will be deleted after the query is executed.

## Entity

- Is a globally unique object.
- Contains an isEntity method that checks for an identifier in the object, and also calls canBeInsert.
- It can be stored in a database as a stand-alone entity or as part of a root aggregation entity.

## User

- The basic implementation of the user class. Not mandatory for use but recommended for use.

## Log

- Used to display different types of information in a list.

## Validate

- Used to store information about the validation of any field in the object. The object can be transmitted over the network.
- Often used to validate form data, but not limited to form data. You can use Validate inside algorithms and other complex operations, both on the client and on the server. Very useful for implementing asynchronous form data validation on the server.

## ValidateResult

- Is the store for Validate, in addition to the store role calculates derived data from Validate.

## ws

- wsChannels - Contains the official names of the channels.
- wsEventEnum - Contains the official names of the events.
- wsHelpers - Contains functions that structure messages before sending and parse the message when receiving, it is very convenient to use these functions simultaneously on the client and server. They provide a consistent message format.

## Build

To build a library, run the following commands:

```sh
npm i -g rearguard

npm i

npm run build
```
