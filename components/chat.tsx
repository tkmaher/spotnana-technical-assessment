"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TextareaAutosize from "react-textarea-autosize";
import ReactMarkdown from "react-markdown";

const API_URL = "https://spotnana-technical-assessment-backend.tomaszkkmaher.workers.dev/chat";

interface Message {
  id: string;
  message: string;
  role: string;
}

interface ApiResponse {
  parts?: { text?: string }[];
  role?: string;
}

function MessageBubble({ msg }: { msg: Message }) {
  const [copied, setCopied] = useState(false);
  return (
    <div 
      className={`msg-parent ${msg.role === "user" ? "msg-right" : "msg-left"}`}
      onMouseLeave={() => setCopied(false)}
    >
      {/* Individual message component */}
      <div className={`bubble msg`}>
        <ReactMarkdown>{msg.message}</ReactMarkdown>
      </div>
      <div className={`msg-spacer ${msg.role === "user" ? "msg-right" : "msg-left"}`}>
        <div 
          className="msg-button"
          onClick={async () => {
            await navigator.clipboard.writeText(msg.message);
            setCopied(true);
          }}
        >
          {copied ? "Copied" : "Copy..."}
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const [chatLog, setChatLog]       = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [fetching, setFetching]     = useState(true);
  const [deleting, setDeleting]       = useState(false);
  const [clearing, setClearing]     = useState<boolean>(false);
  const [error, setError]           = useState<string | null>(null);
  const [thinking, setThinking]     = useState(false);
  const sessionId                   = useRef("");
  const thinkingId                  = useRef("");  // stable ID reused when replacing thinking bubble
  const messagesEndRef              = useRef<HTMLDivElement>(null);
  const textareaRef                 = useRef<HTMLTextAreaElement>(null);

  function parseMessage(item: ApiResponse): Message {
    return {
      id: crypto.randomUUID(),
      message: Array.isArray(item?.parts)
        ? item.parts.map(p => p?.text ?? "").join("")
        : "",
      role: item?.role ?? "model",
    };
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  useEffect(() => {
    const init = async () => {
      const id = localStorage.getItem("chat_session_id") ?? crypto.randomUUID();
      localStorage.setItem("chat_session_id", id);
      sessionId.current = id;

      try {
        const res = await fetch(API_URL, {
          method: "GET",
          headers: { Authorization: `Bearer ${id}` },
        });
        if (!res.ok) throw new Error(`Failed to load chat history (${res.status})`);
        const data = await res.json();
        setChatLog(data.history.map(parseMessage));
      } catch (err: any) {
        console.error("Init error:", err.message);
        // Fatal: can't recover without a reload
        setError("Couldn't connect to the server. Please refresh the page.");
      }
      setFetching(false);
    };
    init();
  }, []);


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const triggerClear = () => {
    if (deleting || thinking || error) return;
    setClearing(true);
  }

  const clearChat = async () => {
    if (deleting || thinking || error) return;
    setDeleting(true);
    setClearing(false);
    try {
      const res = await fetch(API_URL, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionId.current}` },
      });
      if (!res.ok) throw new Error(`Failed to clear chat (${res.status})`);
      setChatLog([]);
    } catch (err: any) {
      console.error("Clear error:", err.message);
      setError("Couldn't clear the chat. Please try again.");
    }
    setDeleting(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (!input.trim() || thinking || deleting || error || fetching) return;
    const msg = input;
    setInput("");
    setChatLog(prev => [...prev, { id: crypto.randomUUID(), message: msg, role: "user" }]);
    const placeholderId = crypto.randomUUID();
    thinkingId.current = placeholderId;

    try {
      setThinking(true);
      setChatLog(prev => [...prev, { id: placeholderId, message: "*Thinking...*", role: "model" }]);
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionId.current}`,
        },
        body: JSON.stringify({ message: msg }),
      });
      if (!res.ok) throw new Error(`Failed to send message (${res.status})`);
      const data = await res.json();

      setChatLog(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          id: thinkingId.current,
          message: data.response ?? "",
          role: "model",
        };
        return updated;
      });
    } catch (err: any) {
      console.error("Submit error:", err.message);
      setChatLog(prev => prev.slice(0, -1));
      setError("Something went wrong sending your message. Please try again.");
    }
    setThinking(false);
    textareaRef.current?.focus();
  };

  const dismissError = () => {
    setError(null);
    textareaRef.current?.focus();
  };

  return (
    <div className="chatlog">
      {/* Mssage display area */}
      <div className="messages-wrapper">
        <AnimatePresence>
          {chatLog.map((item, index) => (
            <motion.div
              key={item.id}
              className={(thinking && index == chatLog.length - 1) ? "messages-inner shine-load" : "messages-inner"}
              initial={{ opacity: 0, x: item.role === "model" ? 12 : -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: item.role === "model" ? 12 : -12 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <MessageBubble msg={item} />
            </motion.div>
          ))}
        </AnimatePresence>
        <AnimatePresence>
          {deleting && (
            <motion.div
              className="bubble loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              Deleting...
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      {/* Message input form */}
      <div className={chatLog.length > 0 ? "form" : "form form-centered"}>
        <div className="input-container bubble">
          <TextareaAutosize
            id="user-input"
            maxRows={10}
            minRows={2}
            placeholder="What's on your mind?"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            ref={textareaRef}
          />
          <AnimatePresence>
            {input.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.1 }}
              >
                <button
                  aria-label="Submit chat"
                  className={(deleting || thinking || fetching) ? "button-disabled bubble" : "bubble"}
                  onClick={handleSubmit}
                >
                  →
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Chat clear button */}
        <AnimatePresence>
          {chatLog.length > 0 && (
            <motion.div
              className="toolbar"
              initial={{ opacity: 0, y: 6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 6, height: 0 }}
              transition={{ duration: 0.15 }}
            >
              <button
                aria-label="Clear chat"
                className={(deleting || thinking || fetching || !!error) ? "button-disabled bubble" : "bubble"}
                onClick={triggerClear}
              >
                Clear chat...
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Error message popup */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="blurrer error-msg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div>{error}</div>
            <button
              aria-label="Close error message"
              className="bubble"
              onClick={dismissError}
            >
              OK
            </button>
          </motion.div>
        )}
        {/* Chat clearing confirmation popup */}
        {clearing && (
          <motion.div
            className="blurrer error-msg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setClearing(false)}
          >
            <div>Delete chat history?</div>
            <div className="button-flex">
              <button
                aria-label="Confirm chat deletion"
                className="bubble confirm"
                onClick={clearChat}
              >
                Delete
              </button>
              <button
                aria-label="Cancel chat deletion"
                className="bubble"
                onClick={() => setClearing(false)}
                autoFocus
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Initial pageload blur effect */}
      <motion.div
        className="blurrer"
        initial={{ opacity: 1 }}
        animate={{ opacity: 0, pointerEvents: "none" }}
        transition={{ duration: 1 }}
      />
    </div>
  );
}