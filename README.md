<h1 align="center">Welcome to react-drive 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000" />
  <a href="https://twitter.com/alexgurr" target="_blank">
    <img alt="Twitter: alexgurr" src="https://img.shields.io/twitter/follow/alexgurr.svg?style=social" />
  </a>
</p>

> An all-in-one react wrapper around Google's drive file picker. Supports direct downloads & blob exports.

### 🏠 [Homepage](https://github.com/alexgurr/react-drive)

## Install

```sh
yarn add react-drive
```
or
```sh
npm install react-drive
```
<br />
<br />

## About

- Scripts are lazy loaded when the component is initially rendered.
- When the trigger is clicked we prompt the user to authenticate if a session is not already present.
- The file picker is shown
- Selected files can either be directly downloaded to the user's device, saved in memory as blobs or returned as drive file references
<br />
<br />

## Prerequisites

You'll need two things from the google developers console. A `client id` and an `api key`. To get these you'll need a `project` with the **Google Picker API** enabled. Once you've created a new project and selected it:

[console.developers.google.com](https://[console.developers.google.com]()) > Dashboard > + ENABLE APIS AND SERVICES > Google Picker API > Enable

------

[console.developers.google.com](https://[console.developers.google.com]()) > Credentials > Create Credentials > OAuth Client 

*Part of this will be to create a consent screen. If you just want to test in development, you don't need to submit. Simple save and go back.*

------

[console.developers.google.com](https://[console.developers.google.com]()) > Credentials > Create Credentials > API Key
<br />
<br />

## Options

### children `node` **(required)**
A react element/node to handle the triggering of the picker. Use the [`injectOnClick`](#injectonclick-boolean) prop to determine how the trigger is made clickable.
<br />
<br />

### clientId `string` (required)

The client id you created above.
<br />
<br />

### apiKey `string` (required)

The API key you created above.
<br />
<br />

### onEvent `function(event, payload?)` (required)

The `onEvent` callback is called multiple times during the picker lifecycle. The first argument is always the event type and the second argument is an optional payload that's included with certain events (see below). You can handle as many of the events below in your callback function as you need.

*We provide the user's access key as part of the payload, in case you want to handle file downloading server side and don't want to have to go through the authentication flow again.*
<br />
<br />

##### Events

`CANCEL` - When the user cancels/closes the picker without selecting any files

------

`ERROR` - When the picker throws an error

------

`START_REMOTE_PULL` - **Only called when** [`exportAsBlobs`](#exportasblobs-boolean) **is set to *true***. Will fire just before we start pulling individual files from drive.

------

`SELECTED_FILE` - **Only called when** [`exportAsBlobs`](#exportasblobs-boolean) **is set to *true***. Will get fired everytime a blob is resolved from drive.

Payload is ```{ accessToken: string, file: blob }```

------

`SELECTED_FILES` - The final event, called when all files are resolved. If  [`exportAsBlobs`](#exportasblobs-boolean) is set to **false**, the files will be an array of `drive doc objects`,  otherwise an array of `blobs`.

Payload is ```{ accessToken: string, files: [blob | doc] }```
<br />
<br />

### exportMimeTypesOverrides `object`

In Google Drive, files are handled differently depending on whether they are a `Google Document` or an actual file. Direct files are downloaded as you would expect, with a **preserved mime type**.

Google Documents have to be mapped to mime types when they are exported. `react-drive` provides some sensible defaults but all of them are overridable. You can see the supported export mime types [here](https://developers.google.com/drive/api/v3/ref-export-formats).

```javascript
{
  document: `string` (default: application/pdf),
  drawing: `string` (default: image/png),
  presentation: `string` (default: application/pdf),
  script: `string` (default: application/vnd.google-apps.script+json),
  spreadsheet: `string` (default: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
}
```
<br />
<br />

### origin `string`

Sets the origin of picker dialog. The origin should be set to the `window.location.protocol + '//' + window.location.host` of the top-most page, if your application is running in an iframe.
<br />
<br />

### multiSelect `boolean`

 `default: true`

Allow the user to select more than one file.
<br />
<br />

### exportAsBlobs `boolean`

 `default: true`

Should `react-files` download the selected files to the browser as blobs.
<br />
<br />

### injectOnClick `boolean`

 `default: true`

Should `react-files` inject the `onClick` event handler directly in the provided child. Fallback is a wrapper container with the handler.
<br />
<br />

### downloadSelectedFiles `boolean`

 `default: false`

Download the selected files automatically to the user's machine after the picker closes
<br />
<br />

### allowSharedDrives `boolean`

 `default: true`

Allow the user to browse shared drives to select files from.
<br />
<br />

### allowedMimeTypes `[string]`

An array of allow mime types, to restrict the files a user can select in the picker.
<br />
<br />

## Examples

#### Server Side Handling

```react
import Drive from 'react-drive';
import copyDriveFilesToUserLib from './api/copyDriveFilesToUserLib';

class SaveDriveFilesToLibrary extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      loading: false
    };
  }
  
  doServerCopy = async ({ accessToken, files: docs }) => {
    this.setState({ loading: true });

    await copyDriveFilesToUserLib({ accessToken, docs });
    
    this.setState({ loading: false });
  }
  
  handleEvent = (event, payload) => {
    if (event !== 'SELECTED_FILES') { return; }
    
    this.doServerCopy(payload);
  } 
  
  render() {
    const { loading } = this.state;
    
    return (
      <div className="library-copy">
        <Drive
          clientId="clientId"
          apiKey="apiKey"
          onEvent={this.handleEvent}
          exportAsBlobs={false}
        >
          <button className=library-copy__select-btn"">Select Drive Files To Copy</button>
        </Drive>
        {loading && <div className="library-copy__loader" />}
      </div>
    );
  }
}
```

#### Local Blob Handling

```react
import Drive from 'react-drive';
import copyDriveFilesToUserLib from './api/copyDriveFilesToUserLib';

class SaveDriveFilesToLibrary extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      files: [],
      loading: false
    };
  }
  
  handleEvent = (event, payload) => {
    if (event === 'START_REMOTE_PULL') {
      return void this.setState({ loading: true });
    }
    
    if (event === 'SELECTED_FILES') {
      this.setState({ files: payload.files });
    }
  } 
  
  render() {
    const { loading, files } = this.state;
    
    return (
      <div className="library-copy">
        <Drive
          clientId="clientId"
          apiKey="apiKey"
          onEvent={this.handleEvent}
        >
          <button className="library-copy__select-btn">Select Drive Files</button>
        </Drive>
        {loading && <div className="library-copy__loader" />}
        {files.length && files.map(file => <p>{file.name}</p>)}
      </div>
    );
  }
}
```



<br />
<br />

## Author

👤 **Alex Gurr**

* Website: https://www.alexgurr.com

* Twitter: [@alexgurr](https://twitter.com/alexgurr)

* Github: [@alexgurr](https://github.com/alexgurr)
<br />

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check the [issues page](https://github.com/alexgurr/react-drive/issues). 
<br />
<br />

## Show your support

Give a ⭐️ if this project helped you!
