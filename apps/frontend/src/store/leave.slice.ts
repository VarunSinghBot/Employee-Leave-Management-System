import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { LeaveBalance, ReviewerStats } from "@elms/shared";
import { approvalService, leaveService } from "../services/leave.service";
import { logout } from "./auth.slice";

interface LeaveState {
  balance: LeaveBalance | null;
  balanceYear: number;
  balanceLoading: boolean;
  reviewerStats: ReviewerStats | null;
}

const initialState: LeaveState = {
  balance: null,
  balanceYear: new Date().getFullYear(),
  balanceLoading: false,
  reviewerStats: null,
};

// Balances & reviewer counters are shown on several screens, so they live in the store
export const fetchBalance = createAsyncThunk("leave/balance", async (year: number) => (await leaveService.balance(year)).data);

export const fetchReviewerStats = createAsyncThunk("leave/reviewerStats", async () => (await approvalService.stats()).data);

const leaveSlice = createSlice({
  name: "leave",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBalance.pending, (state, { meta }) => {
        state.balanceLoading = true;
        state.balanceYear = meta.arg;
      })
      .addCase(fetchBalance.fulfilled, (state, { payload }) => {
        state.balance = payload;
        state.balanceLoading = false;
      })
      .addCase(fetchBalance.rejected, (state) => {
        state.balanceLoading = false;
      })
      .addCase(fetchReviewerStats.fulfilled, (state, { payload }) => {
        state.reviewerStats = payload;
      })
      .addCase(logout.fulfilled, () => initialState);
  },
});

export default leaveSlice.reducer;
