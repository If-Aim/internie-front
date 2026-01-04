// src/pages/student/mobile/studentApp.tsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../../../protectedRoute";

import Home from "./home";
import MyPage from "./myPage/myPage";
import NewSchedule from "./schedule/newSchedule";
import EditSchedule from "./schedule/editSchedule";
import QuestionsPage from "./questions/questionsPage";

export default function StudentApp(): React.ReactElement {
  return (
    <Routes>
      {/* 로그인 필요 */}
      <Route element={<ProtectedRoute />}>
        <Route index element={<Home />} />

        <Route path="mypage" element={<MyPage />} />

        <Route path="schedule/new" element={<NewSchedule />} />
        <Route path="schedule/:eventId" element={<EditSchedule />} />
        <Route path="schedule/:scheduleId/questions" element={<QuestionsPage />} />

        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  );
}