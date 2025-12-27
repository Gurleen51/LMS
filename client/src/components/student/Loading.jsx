import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

const Loading = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // wait a bit for webhook to process
    setTimeout(() => {
      navigate("/my-enrollments");
    }, 2000);
  }, []);

  return (
    <div className="h-screen flex items-center justify-center">
      <h2 className="text-xl font-semibold">Finalizing your enrollment...</h2>
    </div>
  );
};

export default Loading;