// src/pages/student/mobile/studentApp.tsx
// 학생화면 라우트
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../../../protectedRoute";

import Home from "./home";
import MyPage from "./myPage/myPage";
import NewSchedule from "./schedule/newSchedule";
import EditSchedule from "./schedule/editSchedule";
import DetailSchedule from "./schedule/detailSchedule";
import QuestionsPage from "./questions/questionsPage";
import SchoolVerify from "./myPage/schoolVerify";

export default function StudentApp(): React.ReactElement {
  return (
    <Routes>
      <Route index element={<Home />} />
      {/* 로그인 필요 */}
      <Route element={<ProtectedRoute />}>
        <Route path="mypage" element={<MyPage />} />
        <Route path="verify" element={<SchoolVerify />} />

        <Route path="schedule/new" element={<NewSchedule />} />
        <Route path="schedule/:eventId" element={<EditSchedule />} />
        <Route path="schedule/:eventDayId/detail" element={<DetailSchedule />} />
        <Route path="schedule/:eventDayId/questions" element={<QuestionsPage />} />

        <Route path="*" element={<Navigate to="." replace />} />
      </Route>
    </Routes>
  );
}