// 학생화면 라우트
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "../../../protectedRoute";

import Home from "./home";
import MyPage from "./myPage/myPage";
import SchoolVerify from "./myPage/schoolVerify";
import Cert from "./myPage/certificates"
import UserModify from "./myPage/userModify";
import GoalCompany from "./myPage/targetCom"

import NewSchedule from "./schedule/newSchedule";
import EditSchedule from "./schedule/editSchedule";
import DetailSchedule from "./schedule/detailSchedule";
import QuestionsPage from "./questions/questionsPage";
import VerifyCodePage from "./myPage/verifyCode";
import WithdrawPage from "./myPage/withdraw";

import EcaStudentApp from "./eca/ecaStudentApp";

export default function StudentApp(): React.ReactElement {
	return (
		<Routes>
			<Route index element={<Home />} />
			{/* 로그인 필요 */}
			<Route element={<ProtectedRoute />}>
				<Route path="mypage" element={<MyPage />} />
				<Route path="mypage/cert" element={<Cert />} />
				<Route path="mypage/modify" element={<UserModify />} />
				<Route path="verify" element={<SchoolVerify />} />
				<Route path="mypage/verify-code" element={<VerifyCodePage />} />
				<Route path="mypage/career-goals" element={<GoalCompany />} />
				<Route path="mypage/withdraw" element={<WithdrawPage />} />

				<Route path="schedule/new" element={<NewSchedule />} />
				<Route path="schedule/:eventId" element={<EditSchedule />} />
				<Route path="schedule/:eventDayId/detail" element={<DetailSchedule />} />
				<Route path="schedule/:eventDayId/questions" element={<QuestionsPage />} />

				<Route path="activities/*" element={<EcaStudentApp />} />

				<Route path="*" element={<Navigate to="." replace />} />
			</Route>
		</Routes>
	);
}