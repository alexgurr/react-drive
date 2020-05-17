/* global gapi, google */
import React, { Component } from 'react';
import Script from 'react-load-script';
import PropTypes from 'prop-types';
import { saveAs } from 'file-saver';

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value, enumerable: true, configurable: true, writable: true,
    });
  } else { obj[key] = value; } return obj;
}
const G_API_JS_URL = 'https://apis.google.com/js/api.js';
const FILE_URL = 'https://www.googleapis.com/drive/v3/files';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const AUTH_SCOPE = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';
const DEFAULT_EXPORT_TYPE_MAP = {
  document: 'application/pdf',
  drawing: 'image/png',
  presentation: 'application/pdf',
  script: 'application/vnd.google-apps.script+json',
  spreadsheet: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
const EVENTS = {
  START_REMOTE_PULL: 'START_REMOTE_PULL',
  CANCEL: 'CANCEL',
  ERROR: 'ERROR',
  SELECTED_FILES: 'SELECTED_FILES',
  SELECTED_FILE: 'SELECTED_FILES',
};
export default class ReactDrive extends Component {
  constructor(props) {
    super(props);

    _defineProperty(this, 'getMimeType', (file) => {
      const {
        exportMimeTypeOverrides,
      } = this.props;
      const typeSplit = file.mimeType.split('.');
      const type = typeSplit[typeSplit.length - 1].toLowerCase();
      return exportMimeTypeOverrides[type] || DEFAULT_EXPORT_TYPE_MAP[type];
    });

    _defineProperty(this, 'downloadFiles', async (data) => {
      const {
        onEvent,
        downloadSelectedFiles,
        exportAsBlobs,
      } = this.props;

      if (data.action === google.picker.Action.CANCEL) {
        return onEvent(EVENTS.CANCEL);
      }

      if (data.action === google.picker.Action.ERROR) {
        return onEvent(EVENTS.ERROR);
      }

      if (data.action !== google.picker.Action.PICKED) {
        return;
      }

      const {
        accessToken,
      } = this.state;
      const docs = data[google.picker.Response.DOCUMENTS];

      if (!exportAsBlobs) {
        return void onEvent(EVENTS.SELECTED_FILES, {
          accessToken,
          files: docs,
        });
      }

      const fetchOptions = {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      };
      onEvent(EVENTS.START_REMOTE_PULL);
      const blobs = (await Promise.all(docs.map(async (file) => {
        const isDoc = file.type.toLowerCase() === 'document';
        const mimeType = isDoc && this.getMimeType(file);

        if (isDoc && !mimeType) {
          console.warn(`No corresponding mime type for selected file type (${file.mimeType})`);
          return null;
        }

        const url = isDoc ? `${FILE_URL}/${file.id}/export?mimeType=${mimeType}` : `${FILE_URL}/${file.id}?alt=media`;
        const blob = await fetch(url, fetchOptions).then((res) => res.blob());
        onEvent(EVENTS.SELECTED_FILE, {
          accessToken,
          file: blob,
        });

        if (downloadSelectedFiles) {
          saveAs(blob, file.name);
        }

        return blob;
      }))).filter(Boolean);
      onEvent(EVENTS.SELECTED_FILES, {
        accessToken,
        files: blobs,
      });
    });

    _defineProperty(this, 'createPicker', () => {
      const {
        accessToken,
        signedIn,
        pickerInitialised,
      } = this.state;
      const {
        multiSelect,
        allowSharedDrives,
        allowedMimeTypes,
        origin,
        apiKey,
      } = this.props;

      if (!signedIn || !pickerInitialised) {
        return;
      }

      const defaultView = new google.picker.DocsView().setIncludeFolders(true).setOwnedByMe(true);

      if (allowedMimeTypes) {
        defaultView.setMimeTypes(allowedMimeTypes.join(','));
      }

      const picker = new google.picker.PickerBuilder().addView(defaultView).setOAuthToken(accessToken).setDeveloperKey(apiKey)
        .setCallback(this.downloadFiles);

      if (multiSelect) {
        picker.enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
      }

      if (origin) {
        picker.setOrigin(origin);
      }

      if (allowSharedDrives) {
        const sharedDriveView = new google.picker.DocsView().setEnableDrives(true);

        if (allowedMimeTypes) {
          sharedDriveView.setMimeTypes(allowedMimeTypes.join(','));
        }

        picker.addView(sharedDriveView);
      } else {
        picker.enableFeature(window.google.picker.Feature.NAV_HIDDEN);
      }

      picker.build().setVisible(true);
    });

    _defineProperty(this, 'handleSelectFiles', () => {
      if (this.state.signedIn) {
        return void this.createPicker();
      }

      gapi.auth2.getAuthInstance().signIn();
    });

    _defineProperty(this, 'updateSignInStatus', (newSignedIn) => {
      const {
        signedIn,
        init,
      } = this.state;

      if (!init && newSignedIn && !signedIn) {
        return void this.setState({
          signedIn: true,
        }, this.createPicker);
      }

      const accessToken = newSignedIn ? gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token : void 0;
      this.setState({
        signedIn: newSignedIn,
        init: false,
        accessToken,
      });
    });

    _defineProperty(this, 'initClient', () => {
      const {
        apiKey,
        clientId,
      } = this.props;
      gapi.client.init({
        apiKey,
        clientId,
        discoveryDocs: [DISCOVERY_DOC],
        scope: AUTH_SCOPE,
      });
    });

    _defineProperty(this, 'initAuth', async () => {
      const {
        clientId,
      } = this.props;
      await gapi.auth2.init({
        client_id: clientId,
        scope: AUTH_SCOPE,
        immediate: false,
      });
      gapi.auth2.getAuthInstance().isSignedIn.listen(this.updateSignInStatus);
      this.updateSignInStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
    });

    _defineProperty(this, 'initPicker', () => {
      this.setState({
        pickerInitialised: true,
      });
    });

    _defineProperty(this, 'onScriptLoad', () => {
      gapi.load('auth2', this.initAuth);
      gapi.load('client', this.initClient);
      gapi.load('picker', this.initPicker);
    });

    this.state = {
      init: true,
    };
  }

  render() {
    const {
      children,
      injectOnClick,
    } = this.props;

    if (!injectOnClick) {
      return /* #__PURE__ */React.createElement('div', {
        onClick: this.handleSelectFiles,
      }, /* #__PURE__ */React.createElement(Script, {
        url: G_API_JS_URL,
        onLoad: this.onScriptLoad,
      }), children);
    }

    return /* #__PURE__ */React.createElement(React.Fragment, null, /* #__PURE__ */React.createElement(Script, {
      url: G_API_JS_URL,
      onLoad: this.onScriptLoad,
    }), React.cloneElement(children, {
      onClick: this.handleSelectFiles,
    }));
  }
}

_defineProperty(ReactDrive, 'propTypes', {
  children: PropTypes.node.isRequired,
  clientId: PropTypes.string.isRequired,
  apiKey: PropTypes.string.isRequired,
  exportMimeTypeOverrides: {
    document: PropTypes.string,
    drawing: PropTypes.string,
    presentation: PropTypes.string,
    script: PropTypes.string,
    spreadsheet: PropTypes.string,
  },
  origin: PropTypes.string,
  onEvent: PropTypes.func.isRequired,
  multiSelect: PropTypes.bool,
  injectOnClick: PropTypes.bool,
  allowSharedDrives: PropTypes.bool,
  allowedMimeTypes: PropTypes.arrayOf(PropTypes.string),
  exportAsBlobs: PropTypes.bool,
});

_defineProperty(ReactDrive, 'defaultProps', {
  multiSelect: true,
  injectOnClick: true,
  allowSharedDrives: true,
  exportAsBlobs: true,
  downloadSelectedFiles: false,
  exportMimeTypeOverrides: {},
});
