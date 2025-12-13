// src/pages/questionsPage.tsx
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/questions.css";

type Stage = "intro" | "asking";
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
  const { eventDayId } = useParams<{ eventDayId: string }>();

  const [questions, setQuestions] = React.useState<QuestionDto[]>([]);
  const [index, setIndex] = React.useState(0);
  const [stage, setStage] = React.useState<Stage>("intro");

  const [recordStage, setRecordStage] = React.useState<RecordStage>("closed");
  const [levels, setLevels] = React.useState<number[]>(() => Array(BARS).fill(0));
  const [ringLevel, setRingLevel] = React.useState(0);

  const audioCtxRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const dataArrayRef = React.useRef<Float32Array | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);

  const uploadAudio = async (audioBlob: Blob) => {
    if (!current) return;

    // 1. 파일 객체 생성 (확장자는 webm 또는 mp3 등 백엔드 요구사항에 맞춤)
    const audioFile = new File([audioBlob], "voice_record.webm", { type: "audio/webm" });

    // 2. FormData 생성
    const formData = new FormData();
    formData.append("file", audioFile); // 백엔드에서 받는 키 이름이 'file'인지 확인 필요!
    // formData.append("questionId", current.id); // 필요시 질문 ID 등 추가

    const token = localStorage.getItem("accessToken"); // 토큰 이름 확인

    try {
      // TODO: 실제 백엔드 업로드 API 주소로 변경해주세요!
      // 예: `/questions/${current.id}/answers` 
      const res = await fetch(`/questions/${current.id}/answers`, {
        method: "POST",
        headers: {
            // FormData는 Content-Type을 설정하지 않아야 브라우저가 알아서 boundary를 설정함
            "Authorization": token ? token : "", 
        },
        body: formData,
      });

      if (res.ok) {
        console.log("업로드 성공!");
        // 여기서 다음 단계로 넘어가는 등의 처리를 할 수도 있음
      } else {
        console.error("업로드 실패:", res.status);
      }
    } catch (e) {
      console.error("업로드 중 에러:", e);
    }
  };

  const [showOutro, setShowOutro] = React.useState(false);
  // 질문 불러오기
  React.useEffect(() => {
    const fetchQuestions = async () => {
      // 1. 토큰 가져오기 (App.tsx와 동일하게)
      const token = localStorage.getItem("accessToken"); 
      if (!token) {
        alert("로그인이 필요합니다.");
        navigate("/login"); // navigate 변수가 선언되어 있어야 합니다.
        return;
      }

      try {
        // 2. 질문 목록 API 호출
        // [중요] 백엔드 개발자분이 알려준 '질문 조회 API 주소'를 아래에 적어야 합니다.
        // 예시: `/daily-events/${eventDayId}/questions` 또는 그냥 `/questions`
        const res = await fetch(`/questions`, { 
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token, // Bearer 중복 없이 토큰만 전송
          },
        });

        if (res.ok) {
          const data = await res.json();
          console.log("질문 목록 응답:", data);

          // 3. 받아온 데이터를 상태(State)에 저장
          // 만약 백엔드가 { items: [...] } 형태로 준다면 data.items로 수정 필요
          // 백엔드 데이터 필드명(questionText 등)이 다르다면 map으로 연결해야 함
          setQuestions(data); 
        } else {
          console.error("질문 불러오기 실패:", res.status);
        }
      } catch (e) {
        console.error("에러 발생:", e);
      }
    };

    fetchQuestions();
  }, []);
  
  const current = questions[index] ?? null;
  const total = (current?.totalCount ?? questions.length) || 1;
  const currentNo = current?.order ?? index + 1;

  const isLastQuestion = index === questions.length - 1;
  // 인트로 → 질문 화면 전환
  React.useEffect(() => {
    if (stage !== "intro" || showOutro) return;
    if (!current) return;

    const timer = setTimeout(() => setStage("asking"), 1500);
    return () => clearTimeout(timer);
  }, [stage, current, showOutro]);

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
    
    if (recordStage === "closed") {setLevels(Array(BARS).fill(0)); setRingLevel(0);}
  
  }, [recordStage]);

  React.useEffect(() => {
    if (recordStage !== "recording") {
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

          // 전체 RMS 구하기
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
        audioChunksRef.current = []; // 초기화

        // 데이터가 들어올 때마다 배열에 저장
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        // 녹음이 정지되면 파일을 만들고 업로드
        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          uploadAudio(audioBlob); // 위에서 만든 업로드 함수 호출
        };

        recorder.start();

      } catch (err) {
        console.error("마이크 접근 실패", err);
        alert("마이크 권한을 허용해 주셔야 녹음할 수 있어요.");
        setRecordStage("closed");
      }
    };

    start();

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [recordStage]);

  React.useEffect(() => {
    if (!showOutro) return;

    const timer = window.setTimeout(() => {
      setShowOutro(false);

      if (isLastQuestion) {
        navigate("/");
      } else {
        setIndex((prev) => prev + 1);
        setStage("asking");
      }
      setShowOutro(false);
    }, 2000); // 2초

    return () => clearTimeout(timer);
  }, [showOutro, isLastQuestion, navigate]);

  return (
    <div className="screen">
      {/* 인트로 화면 */}
      {stage === "intro" && (
        <main className="questions-intro">
          <img
            src="/internie_mascot_normal.png"
            alt=""
            className="questions-intro-img"
          />
          <p className="questions-intro-text">
            인터니가 질문을 준비하고 있어요!
            <br />
            오늘은 어떤 역량을 얻을 수 있을까요?
          </p>
        </main>
      )}

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
                      {recordStage === "preparing" ? "녹음 준비중이에요" : "지금 말하세요"}
                    </p>

                    {/* 흰색 마이크 버튼 */}
                    <div
                      className={
                        "recording-mic-ring" +
                        (recordStage === "recording" ? " recording-mic-ring--active" : "")
                      }
                      style={{
                        background: `rgba(255, 255, 255, ${0.1 + ringLevel * 0.4})`
                      }}
                    >
                      <button
                        type="button"
                        className={
                          "recording-mic-btn" +
                          (recordStage === "recording" ? " recording-mic-btn--active" : "")
                        }
                        onClick={() => {
                          if (recordStage === "recording") {
                            setRecordStage("closed");
                            setShowOutro(true);
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
    </div>
  );
}
