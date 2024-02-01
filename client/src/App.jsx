import React, { useEffect, useState } from "react";
import { Navbar, NavbarBrand, UncontrolledTooltip } from "reactstrap";
import useWebSocket, { ReadyState } from "react-use-websocket";
// import Editor from "react-simple-wysiwyg";
import Avatar from "react-avatar";
import { v4 as uuidv4 } from "uuid";

import "./App.css";

const { REACT_APP_WEBSOCKET_URL } = import.meta.env;
const WS_URL = REACT_APP_WEBSOCKET_URL || "ws://127.0.0.1:8000";
console.log(WS_URL);

function isUserEvent(message) {
  let evt = JSON.parse(message.data);
  return evt.type === "userevent";
}

function isDocumentEvent(message) {
  let evt = JSON.parse(message.data);
  return evt.type === "contentchange" || evt.type === "file";
}

let loginUserName = "";
let loginChannelName = "";

function App() {
  const [username, setUsername] = useState("");
  const [channelName, setChannelname] = useState("");
  const { sendJsonMessage, readyState } = useWebSocket(WS_URL, {
    onOpen: () => {
      console.log("WebSocket connection established.");
    },
    share: true,
    filter: () => false,
    retryOnError: true,
    shouldReconnect: () => true,
  });

  useEffect(() => {
    if (username && channelName && readyState === ReadyState.OPEN) {
      sendJsonMessage({
        username,
        channelName,
        type: "userevent",
      });
    }
  }, [username, channelName, sendJsonMessage, readyState]);

  return (
    <>
      <Navbar color="light" light>
        <NavbarBrand href="/">Real-time document editor</NavbarBrand>
      </Navbar>
      <div className="container-fluid">
        {username ? (
          <EditorSection />
        ) : (
          <LoginSection
            onLogin={(username, channelname) => {
              setUsername(username);
              setChannelname(channelname);
            }}
          />
        )}
      </div>
    </>
  );
}

function LoginSection({ onLogin }) {
  const [username, setUsername] = useState("");
  const [channelname, setChannelname] = useState("");
  useWebSocket(WS_URL, {
    share: true,
    filter: () => false,
  });
  function logInUser() {
    if (!username.trim()) {
      return;
    }
    loginUserName = username;
    loginChannelName = channelname;

    onLogin && onLogin(username, channelname);
  }

  return (
    <div className="account">
      <div className="account__wrapper">
        <div className="account__card">
          <div className="account__profile">
            <p className="account__name">Hello, user!</p>
            <p className="account__sub">Join to edit the document</p>
          </div>
          <input
            name="username"
            onInput={(e) => setUsername(e.target.value)}
            className="form-control"
            placeholder="username"
          />
          <input
            name="channelname"
            onInput={(e) => setChannelname(e.target.value)}
            className="form-control"
            placeholder="channelname"
          />
          <button
            type="button"
            onClick={() => logInUser()}
            className="btn btn-primary account__btn"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
/*
function History() {
  console.log("history");
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isUserEvent,
  });
  const activities = lastJsonMessage?.data.userActivity || [];
  return (
    <ul>
      {activities.map((activity, index) => (
        <li key={`activity-${index}`}>{activity}</li>
      ))}
    </ul>
  );
}
*/

function Users() {
  const { lastJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isUserEvent,
  });
  const users = Object.values(lastJsonMessage?.data.users || {});
  return users.map((user) => (
    <div key={user.username}>
      <span id={user.username} className="userInfo" key={user.username}>
        <Avatar name={user.username} size={40} round="20px" />
      </span>
      <UncontrolledTooltip placement="top" target={user.username}>
        {user.username}
      </UncontrolledTooltip>
    </div>
  ));
}

function EditorSection() {
  return (
    <div className="main-content">
      <div className="document-holder">
        <div className="currentusers">
          <Users />
        </div>
        <Document />
      </div>
      {/*
      <div className="history-holder">
        <History />
      </div>
      */}
    </div>
  );
}

function Document() {
  const [file, setFiles] = useState();
  const [html, setHtml] = useState();
  const [messages, setMessages] = useState([]);
  const { lastJsonMessage, sendJsonMessage } = useWebSocket(WS_URL, {
    share: true,
    filter: isDocumentEvent,
  });

  useEffect(() => {
    if (lastJsonMessage?.messageId) {
      setMessages([...messages, lastJsonMessage]);
    }
    // eslint-disable-next-line
  }, [lastJsonMessage]);

  function onSendClick() {
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        sendJsonMessage({
          type: "file",
          content: reader.result,
          mimeType: file.type,
          fileName: file.name,
          userObj: { username: loginUserName },
          messageId: uuidv4(),
          channelName: loginChannelName,
        });
      };
    } else {
      sendJsonMessage({
        type: "contentchange",
        content: html,
        userObj: { username: loginUserName },
        messageId: uuidv4(),
        channelName: loginChannelName,
      });
    }
    const fileRef = document.querySelector(".file");
    fileRef.value = "";
    setFiles("");
    setHtml("");
  }

  const handleHtmlChange = (e) => {
    setHtml(e.target.value);
  };

  const handleFileChange = (e) => {
    setFiles(e.target.files[0]);
  };
  const fileTypes = ["image/png", "image/jpeg", "image/jpg"];
  return (
    <div>
      <ul className="message-list">
        {messages.map((message) => {
          const { content, messageId, userObj, mimeType } = message;
          return (
            <li
              key={messageId}
              className={`message ${
                userObj.username === loginUserName ? "text-right" : ""
              }`}
            >
              <div>{userObj.username}</div>
              {message.type === "file" ? (
                <div>
                  {fileTypes.includes(mimeType) ? (
                    <img alt="img" src={content} width="200" />
                  ) : (
                    <iframe src={content} width="50%" />
                  )}
                </div>
              ) : (
                <div>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      {/*  <Editor value={html} onChange={handleHtmlChange} /> */}
      <textarea
        name="comment"
        value={html}
        onChange={handleHtmlChange}
        placeholder="send message"
        style={{ width: "100%" }}
      />
      <input
        type="file"
        accept=".jpg, .jpeg, .png, .pdf, .txt, .docx, .doc"
        onChange={handleFileChange}
        className="file"
      />

      <button
        type="button"
        onClick={onSendClick}
        className="btn btn-primary account__btn"
      >
        Send
      </button>
    </div>
  );
}

export default App;
