import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import "./index.css";
import App from "./App";
import { store } from "./store";
import { fetchMe, sessionExpired } from "./store/auth.slice";
import { setSessionExpiredHandler } from "./services/api.service";
import { AppToaster } from "./UI/Toast";

// When the refresh token is also expired, drop the user back to the login screen
setSessionExpiredHandler(() => store.dispatch(sessionExpired()));
store.dispatch(fetchMe());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
      <AppToaster />
    </Provider>
  </StrictMode>,
);
