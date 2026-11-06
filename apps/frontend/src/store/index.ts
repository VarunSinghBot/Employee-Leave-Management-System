import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";
import { REVIEWER_ROLES } from "@elms/shared";
import authReducer from "./auth.slice";
import leaveReducer from "./leave.slice";

export const store = configureStore({
  reducer: { auth: authReducer, leave: leaveReducer },
  // Rejected thunks carry axios errors (used for field errors), which aren't serializable
  middleware: (getDefault) => getDefault({ serializableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export const useAuth = () => {
  const { user, status } = useAppSelector((s) => s.auth);
  return { user, status, isReviewer: !!user && REVIEWER_ROLES.includes(user.role) };
};
