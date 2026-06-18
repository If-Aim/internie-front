import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import EcaStudentLayout from "./ecaStudentLayout";
import EcaStudentActivityGuard from "./ecaStudentActivityGuard";
// import EcaStudentActivityList from "./home/activityList";
import EcaStudentDashboard from "./dashboard/dashboard/dashboard";
import EcaStudentAssignment from "./dashboard/assignment/assignment";
import EcaStudentAssignmentSubmit from "./dashboard/assignment/assignmentSubmit";

export default function EcaStudentApp(): React.ReactElement {
    return (
        <Routes>
            <Route element={<EcaStudentLayout />}>
                {/* <Route index element={<EcaStudentActivityList />} /> */}

                <Route element={<EcaStudentActivityGuard />}>
                    <Route path=":externalActivityId" element={<Navigate to="dashboard" replace />} />
                    <Route path=":externalActivityId/dashboard" element={<EcaStudentDashboard />} />
                    <Route path=":externalActivityId/assignment" element={<EcaStudentAssignment />} />
                    <Route path=":externalActivityId/assignment/:assignmentId" element={<EcaStudentAssignmentSubmit />} />
                </Route>
            </Route>
        </Routes>
    );
}