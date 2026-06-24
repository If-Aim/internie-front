// src/pages/admin/mobile/ecaClient/ecaClientAdminApp.tsx
// 대외활동 관리자 모바일 라우트
import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import EcaClientAdminMobileHome from "./ecaHome";
import EcaHomePage from "../../desktop/ecaClient/home/home";
import EcaActivityCreatePage from "../../desktop/ecaClient/home/createEca";
import EcaDashboardDashboard from "../../desktop/ecaClient/dashboard/dashboard/dashboard";
import EcaDashboardAssignment from "../../desktop/ecaClient/dashboard/assignment/assignment";
import EcaNewAssignmentPage from "../../desktop/ecaClient/dashboard/assignment/newAssignment";
import EcaAssignmentDetailPage from "../../desktop/ecaClient/dashboard/assignment/assignmentDetail";
import EcaAssignmentEvaluationPage from "../../desktop/ecaClient/dashboard/assignment/assignmentEvaluation";
import EcaEvaluationPage from "../../desktop/ecaClient/dashboard/evaluation/evaluation";
import EcaEvaluationDetailPage from "../../desktop/ecaClient/dashboard/evaluation/evaluationDetail";
import EcaDashboardAttendance from "../../desktop/ecaClient/dashboard/attendance/attendance";
import EcaDashboardAttendanceDetail from "../../desktop/ecaClient/dashboard/attendance/attendanceDetail";
import EcaDashboardTeamActivity from "../../desktop/ecaClient/dashboard/teamActivity/teamActivity";
import EcaDashboardLeaderboard from "../../desktop/ecaClient/dashboard/leaderboard/leaderboard";
import EcaSettingsPage from "../../desktop/ecaClient/settings/settings";
import "./ecaClientAdminMobile.css";

export default function EcaClientAdminMobileApp(): React.ReactElement {
    return (
        <Routes>
            <Route element={<EcaClientAdminMobileHome />}>
                <Route index element={<Navigate to="home" replace />} />
                <Route path="home" element={<EcaHomePage />} />
                <Route path="activities/new" element={<EcaActivityCreatePage />} />
                <Route path="activities/:externalActivityId/edit" element={<EcaActivityCreatePage />} />
                <Route path="activities/:externalActivityId" element={<Navigate to="dashboard" replace />} />
                <Route path="activities/:externalActivityId/dashboard" element={<EcaDashboardDashboard />} />
                <Route path="activities/:externalActivityId/assignment" element={<EcaDashboardAssignment />} />
                <Route path="activities/:externalActivityId/assignment/new" element={<EcaNewAssignmentPage />} />
                <Route path="activities/:externalActivityId/assignment/:assignmentId" element={<EcaAssignmentDetailPage />} />
                <Route path="activities/:externalActivityId/assignment/:assignmentId/evaluation/:participantId" element={<EcaAssignmentEvaluationPage />} />
                <Route path="activities/:externalActivityId/evaluation" element={<EcaEvaluationPage />} />
                <Route path="activities/:externalActivityId/evaluation/students/:participantType/:targetId" element={<EcaEvaluationDetailPage />} />
                <Route path="activities/:externalActivityId/assignment/:assignmentId/edit" element={<EcaNewAssignmentPage />} />
                <Route path="activities/:externalActivityId/attendance" element={<EcaDashboardAttendance />} />
                <Route path="activities/:externalActivityId/attendance/:eventId" element={<EcaDashboardAttendanceDetail />} />
                <Route path="activities/:externalActivityId/team-activity" element={<EcaDashboardTeamActivity />} />
                <Route path="activities/:externalActivityId/leaderboard" element={<EcaDashboardLeaderboard />} />
                <Route path="settings" element={<EcaSettingsPage />} />
            </Route>
        </Routes>
    );
}
