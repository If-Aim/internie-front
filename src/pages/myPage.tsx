import { useNavigate } from "react-router-dom";
import "../styles/myPage.css";

type Props = {
  email?: string;
  name?: string;
  avatarUrl?: string;
  onLogout?: () => void;
};

export default function MyPage({
  email = "internie@gmail.com",
  name = "사용자",
  avatarUrl = "/internie_mascot_normal.png",
  onLogout,
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="mypage">
      <div className="mypage-top">
        <div className="mypage-email">{email}</div>

        <div className="mypage-avatar-wrap">
          <img className="mypage-avatar" src={avatarUrl} alt="" />
        </div>

        <div className="mypage-greeting">
          안녕하세요, <span className="mypage-name">{name}</span>님
        </div>

        <div className="mypage-actions">
          <button
            type="button"
            className="mypage-action-btn"
            onClick={() => navigate("/account")}
            disabled
          >
            계정 관리하기
          </button>

          <button
            type="button"
            className="mypage-action-btn"
            onClick={() => navigate("/profile/share")}
            disabled
          >
            프로필 공유하기
          </button>
        </div>
      </div>

      <div className="mypage-bottom">
        <button
          type="button"
          className="mypage-logout"
          onClick={() => (onLogout ? onLogout() : navigate("/login"))}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}