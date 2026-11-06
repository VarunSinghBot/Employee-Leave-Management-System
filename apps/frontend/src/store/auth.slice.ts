import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { AuthUser, LoginInput, RegisterInput } from "@elms/shared";
import { authService } from "../services/auth.service";
import { getErrorMessage } from "../utils/format.util";

interface AuthState {
  user: AuthUser | null;
  // "checking" until the first /auth/me call resolves on app load
  status: "checking" | "authenticated" | "guest";
}

const initialState: AuthState = { user: null, status: "checking" };

export const fetchMe = createAsyncThunk("auth/me", async () => (await authService.me()).data);

export const login = createAsyncThunk("auth/login", async (input: LoginInput, { rejectWithValue }) => {
  try {
    return await authService.login(input);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const register = createAsyncThunk("auth/register", async (input: RegisterInput, { rejectWithValue }) => {
  try {
    return await authService.register(input);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const logout = createAsyncThunk("auth/logout", async () => {
  await authService.logout().catch((error) => console.warn(getErrorMessage(error)));
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    sessionExpired: (state) => {
      state.user = null;
      state.status = "guest";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.fulfilled, (state, { payload }) => {
        state.user = payload;
        state.status = "authenticated";
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.status = "guest";
      })
      .addCase(login.fulfilled, (state, { payload }) => {
        state.user = payload.data;
        state.status = "authenticated";
      })
      .addCase(register.fulfilled, (state, { payload }) => {
        state.user = payload.data;
        state.status = "authenticated";
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = "guest";
      });
  },
});

export const { sessionExpired } = authSlice.actions;
export default authSlice.reducer;
