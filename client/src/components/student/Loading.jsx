import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const Loading = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // ⛔ Safety check: only redirect if EXACT path is /loading
    if (location.pathname !== "/loading") return;

    const timer = setTimeout(() => {
      navigate("/my-enrollments", { replace: true });
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate, location.pathname]);

  return (
    <div className="h-screen flex items-center justify-center">
      <h2 className="text-xl font-semibold">
        Finalizing your enrollment...
      </h2>
    </div>
  );
};

export default Loading;
