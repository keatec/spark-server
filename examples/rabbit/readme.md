

# Rabbit connector

* include a messaging server (rabbit) to a spark server solution

## Start

npm install will install all dependencies.

since BUNYAN is required please install bunyan-cli globaly
```
npm install -g bunyan
```

during development you also need to install the typescript compiler

```
npm install -g typescript
```


To start the connector you need to set the enviroment to your spark-server  
A one-liner could be:

**UNIX**
```
export rabc_sparkserver="http://<yourserver>:<yourport>" rabc_username="<username>" rabc_password="<password>"; npm start
```

**Windows**
```
set "rabc_sparkserver=http://<yourserver>:<yourport>" && set "rabc_username=<username>" && set "rabc_passw
ord=<password>" && npm start
```


> We use this parameter system cause this is designed to be run on automated enviroment like DOCKER, AZURECLOUD etc. This is the prefered way to do these things

## Done
* login to server using credentials from enviroment
* output all events to log

## Todo

* process all incoming events from Spark-Server into message queues
* use rabbit to collect and process commands to and from spark-Server (like flashing, functions , etc)

