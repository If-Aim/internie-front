// src/pages/questionsPage.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiUpload, ApiError } from "../api/client";

import "../styles/questions.css";

type Stage = "asking" | "completed";
type RecordStage = "closed" | "preparing" | "recording";

type QuestionDto = {
  id: string;
  order: number;
  text: string;
  totalCount: number; 
};

const BARS = 40; // 파형 바 개수
const SENSITIVITY = 10; // 감도 조절 상수

export default function QuestionsPage() {
  const navigate = useNavigate();
  const { scheduleId } = useParams<{ scheduleId: string }>();

  const [questions, setQuestions] = React.useState<QuestionDto[]>([]);
  const [index, setIndex] = React.useState(0);
  const [stage, setStage] = React.useState<Stage>("asking");

  const [recordStage, setRecordStage] = React.useState<RecordStage>("closed");
  const [isMicOn, setIsMicOn] = React.useState(false);
  const [levels, setLevels] = React.useState<number[]>(() => Array(BARS).fill(0));
  const [ringLevel, setRingLevel] = React.useState(0);

  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const dataArrayRef = React.useRef<Float32Array | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const [eventDayId, setEventDayId] = React.useState<number | null>(null);

  React.useEffect(() => {
    const n = Number(scheduleId); // scheduleId === eventDayId
    if (!Number.isFinite(n)) {
      console.error("eventDayId가 숫자가 아닙니다:", scheduleId);
      return;
    }
    setEventDayId(n);
  }, [scheduleId]);

  const uploadAudioToSTT = async (audioBlob: Blob) => {
    if (!eventDayId) {
      console.error("eventDayId가 없습니다. 먼저 eventDay를 생성해야 합니다.");
      return;
    }

    const token = localStorage.getItem("accessToken");
    if (!token) {
      alert("로그인이 필요합니다.");
      navigate("/login");
      return;
    }

    const audioFile = new File([audioBlob], "voice_record.webm", { type: "audio/webm" });
    const formData = new FormData();
    formData.append("audioFile", audioFile);

    try {
      const result = await apiUpload<any>(`/api/stt/upload/${eventDayId}`, formData);

      console.log("STT 결과:", result);
    } catch (err) {
      console.error(err);

      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) return;
        alert(`STT 업로드 실패: ${err.status}\n${err.bodyText ?? ""}`);
        return;
      }

      alert("STT 업로드 중 네트워크 오류가 발생했습니다.");
    }
  };
  const [showOutro, setShowOutro] = React.useState(false);

  // 질문 불러오기
  React.useEffect(() => {
    const fetchQuestions = async () => {
      // 질문은 일단 mock 그대로
      const mockQuestions: QuestionDto[] = [
        { id: "temp_q1", order: 1, text: "오늘 가장 기억에 남는 일은 무엇인가요?", totalCount: 3 },
        { id: "temp_q2", order: 2, text: "그 일을 통해 무엇을 배웠나요?", totalCount: 3 },
        { id: "temp_q3", order: 3, text: "앞으로 어떻게 내 삶에 적용해볼 수 있을까요?", totalCount: 3 },
      ];
      setQuestions(mockQuestions);
    };

    fetchQuestions();
  }, []);
  
  const current = questions[index] ?? null;
  const total = (current?.totalCount ?? questions.length) || 1;
  const currentNo = current?.order ?? index + 1;

  const isLastQuestion = index === questions.length - 1;
  React.useEffect(() => {
    if (recordStage === "preparing") {
      const staticLevels = Array.from({ length: BARS }, () => 0.15);
      setLevels(staticLevels);
      setRingLevel(0.5);

      const timer = window.setTimeout(() => {
        setRecordStage("recording");
      }, 800);

      return () => window.clearTimeout(timer);
    }
    
    if (recordStage === "closed") {setLevels(Array(BARS).fill(0)); setRingLevel(0);setIsMicOn(false);}
  
  }, [recordStage]);

  React.useEffect(() => {
    if (recordStage !== "recording") {
      setIsMicOn(false);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) return;
        streamRef.current = stream;

        const AC =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        const audioCtx: AudioContext = new AC();
        audioCtxRef.current = audioCtx;

        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 1024;
        source.connect(analyser);
        analyserRef.current = analyser;

        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);
        dataArrayRef.current = dataArray;

        intervalId = window.setInterval(() => {
          const analyserNode = analyserRef.current;
          const arr = dataArrayRef.current;
          if (!analyserNode || !arr) return;

          (analyserNode as any).getFloatTimeDomainData(arr as any);

          let sum = 0;
          for (let i = 0; i < arr.length; i++) {
            const v = arr[i]; // -1 ~ 1
            sum += v * v;
          }
          const rms = Math.sqrt(sum / arr.length);
          const noiseFloor = 0.01;
          const norm = Math.max(0, rms - noiseFloor);
          const amp = Math.min(1, norm * SENSITIVITY);// 감도 적용

          setLevels((prev) => {
            const next = prev.slice(1);
            const minLevel = 0.4;
            const newVal = amp > 0
              ? minLevel + amp * (3 - minLevel) // 0.4 ~ 1.0
              : minLevel;

            next.push(newVal);
            return next;
          });
          setRingLevel(amp);
        }, 60); // 60ms 간격 (약 16fps 정도)

        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;
        audioChunksRef.current = []; 

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        // 녹음이 정지되면 파일을 만들고 업로드
        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          uploadAudioToSTT(audioBlob); 
          setShowOutro(true);
        };

        recorder.start();
        setIsMicOn(true);

      } catch (err) {
        console.error("마이크 접근 실패", err);
        alert("마이크 권한을 허용해 주셔야 녹음할 수 있어요.");
        setRecordStage("closed");
      }
    };

    start();

    return () => {
      cancelled = true;
      if (intervalId !== null) window.clearInterval(intervalId);
    };
  }, [recordStage]);

  React.useEffect(() => {
    if (!showOutro) return;
    const timer = window.setTimeout(() => {
      if (isLastQuestion) {
        setStage("completed"); 
      } else {
        setIndex((prev) => prev + 1);
        setStage("asking");
      }
      setShowOutro(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [showOutro, isLastQuestion, navigate]);

  React.useEffect(() => {
    if (stage === "completed") {
      const timer = setTimeout(() => {
        navigate("/");
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [stage, navigate]);

  return (
    <div className="screen">
      {/* 기록화면 */}
      {stage === "asking" && current && (
          <div className="wrap">
            <div className="spacer-50" aria-hidden="true" />
            <header className="topbar-question">
              <button className="iconbtn" aria-label="메뉴">
                <img className="icon" src="/menu-01.svg" alt="" />
              </button>
              <h1 className="topbar-title">업그라운더 1기</h1>
              <div style={{ width: 24 }} />
            </header>

            <main className="question-page">
              {/* 여기 마스코트 + 카드 배치 */}
              <img
                src="/internie_mascot_normal.png"
                alt=""
                className="mascot"
                width={119}
              />
              <div className="progress-card">
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${(currentNo / total) * 100}%` }}
                  />
                </div>
                <div className="progress-label-row">
                  <span>진행률</span>
                  <span>
                    {currentNo}/{total}
                  </span>
                </div>

                <div className="question-card">
                  <div className="question-header">
                    <div className="q-badge">Q</div>
                    <div className="q-title">질문</div>
                  </div>
                  <p className="question-text">{current.text}</p>
                </div>
              </div>

              {recordStage === "closed" && !showOutro && (
                <button
                  className="mic-button"
                  type="button"
                  onClick={() => {
                    // 준비 상태로 전환
                    setRecordStage("preparing");
                  }}
                >
                  <img src="/microphone-01.svg" alt="" />
                </button>
              )}

              {recordStage !== "closed" && !showOutro && (
                <div className="recording-sheet">
                  <div className="recording-sheet-inner">
                    {/* 흰색 파형 박스 */}
                    <div className="recording-meter">
                      <div className="recording-wave">
                        {levels.map((lv, i) => (
                          <span
                            key={i}
                            className={`wave-bar wave-bar-${i + 1}`}
                            style={{ transform: `scaleY(${lv})` }} 
                          />
                        ))}
                      </div>
                    </div>

                    {/* 텍스트 */}
                    <p className="recording-text">
                      {recordStage === "recording" && isMicOn ? "지금 말하세요" : "녹음 준비중이에요"}
                    </p>

                    <div
                      className={
                        "recording-mic-ring" +
                        (recordStage === "recording" && isMicOn ? " recording-mic-ring--active" : "")
                      }
                      style={{
                        background: isMicOn ? `rgba(255, 255, 255, ${ringLevel * 0.4})` : "transparent"
                      }}
                    >
                      <button
                        type="button"
                        className={"recording-mic-btn" + (recordStage === "recording" ? " recording-mic-btn--active" : "")}
                        disabled={!isMicOn}
                        style={{ opacity: 1, cursor: isMicOn ? 'pointer' : 'default',}}
                        onClick={() => {
                          if (recordStage === "recording" && isMicOn) {
                            const mr = mediaRecorderRef.current;
                            if (mr && mr.state !== "inactive") {
                              mr.stop();
                            }
                            setRecordStage("closed");
                          }
                        }}
                      >
                        <img src="/microphone-01-blue.svg" alt="마이크" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
      )}
      {showOutro && (
        <div className="record-outro-overlay">
          <div className="record-outro-card">
            <div className="record-outro-icon">
              <img src="/check-02.svg" alt="완료" />
            </div>
            <p className="record-outro-text">기록완료!</p>
          </div>
        </div>
      )}
      {stage === "completed" && (
        <div className="wrap">
          <div className="spacer-50" aria-hidden="true" />
          <header className="topbar-completion">
            <button className="iconbtn" aria-label="메뉴">
              <img className="icon" src="/menu-01.svg" alt="" />
            </button>
            <h1 className="topbar-title">활동 보고서</h1>
            <div style={{ width: 24 }} />
          </header>
          <main className="completion-page">
            <div className="completion-content">          
              <h2 className="completion-title">역량 분석 중..</h2>
              <p className="completion-desc">
                인터니가 사용자님의 답변을 분석 중이에요!
              </p>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
