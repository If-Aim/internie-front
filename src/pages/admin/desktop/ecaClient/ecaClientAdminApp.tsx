import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import EcaClientAdminHome from "./ecaHome";
import EcaHomePage from "./home/home";
import EcaActivityCreatePage from "./home/createEca";
import EcaDashboardDashboard from "./dashboard/dashboard/dashboard";
import EcaDashboardAssignment from "./dashboard/assignment/assignment";
import EcaNewAssignmentPage from "./dashboard/assignment/newAssignment";
import EcaAssignmentDetailPage from "./dashboard/assignment/assignmentDetail";
import EcaAssignmentEvaluationPage from "./dashboard/assignment/assignmentEvaluation";
import EcaEvaluationPage from "./dashboard/evaluation/evaluation";
import EcaEvaluationDetailPage from "./dashboard/evaluation/evaluationDetail";
import EcaDashboardAttendance from "./dashboard/attendance/attendance";
import EcaDashboardAttendanceDetail from "./dashboard/attendance/attendanceDetail";
import EcaDashboardTeamActivity from "./dashboard/teamActivity/teamActivity";
import EcaDashboardLeaderboard from "./dashboard/leaderboard/leaderboard";
import EcaSettingsPage from "./settings/settings";

export default function EcaClientAdminApp(): React.ReactElement {
    return (
        <Routes>
            <Route element={<EcaClientAdminHome />}>
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