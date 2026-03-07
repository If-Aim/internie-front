import React from "react";

export type RangeSheetMode = "range" | "startOnly" | "endOnly";

export type TimeSheetProps = {
    step: "start" | "end";
    setStep: React.Dispatch<React.SetStateAction<"start" | "end">>;
    startTime: string | null;
    endTime: string | null;
    onChangeStart: (v: string) => void;
    onChangeEnd: (v: string) => void;
    isAllDay: boolean;
    setIsAllDay: React.Dispatch<React.SetStateAction<boolean>>;
    setStartTime: React.Dispatch<React.SetStateAction<string | null>>;
    setEndTime: React.Dispatch<React.SetStateAction<string | null>>;
    onClose: () => void;
};

export type DateRangeSheetProps = {
    mode: RangeSheetMode;
    startDate: Date;
    endDate: Date;
    onChangeStart: (d: Date) => void;
    onChangeEnd: (d: Date) => void;
    onClose: () => void;
};