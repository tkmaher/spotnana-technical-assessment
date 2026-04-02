# Overview

Welcome! This is a lightweight chatbot web app created for my technical assessment with Spotnana. The frontend is a single-page Next.js application written using TypeScript and hosted on Cloudflare Pages. The backend is a serverless Cloudflare Workers-based [Hono](https://hono.dev/) API. It queries the Google Gemini 3.1 API to return responses to the user and remembers conversations across sessions that have occured on the same browser. I used [Sass](https://sass-lang.com/) and [Motion](https://motion.dev/) for styling.

The main frontend code can be found in /components/chat.tsx. The backend is located in /backend/spotnana-technical-assessment/src/index.ts. The stylesheet is /app/globals.scss.

## [Visit the chatbot here.](https://spotnana-technical-assessment.pages.dev/)

## Features

+ Chat sessions
    + The application is functionally conversational and can maintain extended chats.
+ Chat history
    + The chatbot will remember chat logs across sessions that take place in the same browser. Each user is given an authorization token that is verified on the backend.
+ Chat deletion
    + Pressing the "Clear chat..." button erases the chatbot's memory of the user, effectively beginning a new conversation.
+ Message copying
    + Pressing the "Copy..." button will copy a user's query or an AI response to the clipboard.
+ API integration
    + The backend API has GET, POST, and DELETE routes that support the above features. These routes require user verification via an authorization token sent in the header.

## Limitations

+ Because of the lightweight nature of this Gemini model, the application can only use a limited amount of tokens per query. This makes it better at shorter tasks, but worse at generating open-ended or complex responses.
+ The user token is set in the client and stored in the browser. A real site that used these techniques would be vulnerable to XSS-style attacks; this site, however, has been set up purely for demonstrative purposes.
