/**
 * @jest-environment jsdom
 */

import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
});

global.document = dom.window.document;
global.window = dom.window;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLDivElement = dom.window.HTMLDivElement;
global.HTMLButtonElement = dom.window.HTMLButtonElement;
global.HTMLInputElement = dom.window.HTMLInputElement;
global.HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
global.HTMLSelectElement = dom.window.HTMLSelectElement;
global.HTMLOptionElement = dom.window.HTMLOptionElement;
global.HTMLFormElement = dom.window.HTMLFormElement;
global.Element = dom.window.Element;
global.Node = dom.window.Node;
global.NodeList = dom.window.NodeList;
global.Text = dom.window.Text;
global.DocumentFragment = dom.window.DocumentFragment;
global.Comment = dom.window.Comment;
global.CustomEvent = dom.window.CustomEvent;
global.MouseEvent = dom.window.MouseEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.InputEvent = dom.window.InputEvent;
global.Event = dom.window.Event;
global.FocusEvent = dom.window.FocusEvent;
global.Request = dom.window.Request;
global.Response = dom.window.Response;
global.Headers = dom.window.Headers;
global.fetch = dom.window.fetch;
global.AbortController = dom.window.AbortController;
global.AbortSignal = dom.window.AbortSignal;
global.URL = dom.window.URL;
global.URLSearchParams = dom.window.URLSearchParams;
global.File = dom.window.File;
global.FileList = dom.window.FileList;
global.Blob = dom.window.Blob;
global.FormData = dom.window.FormData;
global.ReadableStream = dom.window.ReadableStream;
global.WritableStream = dom.window.WritableStream;
global.TransformStream = dom.window.TransformStream;
global.crypto = dom.window.crypto;
global.crypto.getRandomValues = dom.window.crypto.getRandomValues;
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;