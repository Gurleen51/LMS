import { createContext, useEffect, useState } from "react";
import { dummyCourses } from "../assets/assets";
import { data, useNavigate } from "react-router-dom";
import humanizeDuration from "humanize-duration";
import { useAuth, useUser} from "@clerk/clerk-react";
import axios from 'axios'
import { toast } from "react-toastify";

export const AppContext = createContext();

export const AppContextProvider = (props) => {

    const backendUrl = import.meta.env.VITE_BACKEND_URL
    console.log("Context Backend URL:", backendUrl);

    const currency = import.meta.env.VITE_CURRENCY
    const navigate = useNavigate()

    const {getToken} = useAuth()
    const {user} = useUser()

    const [allCourses, setAllCourses] = useState([])
    const [isEducator, setIsEducator] = useState(false)
    const [enrolledCourses, setEnrolledCourses] = useState([])
    const [userData, setUserData] = useState(null)

    //Fetch All Courses
    const fetchAllCourses = async () => {
        if (!backendUrl) 
            return toast.error("Configuration Error: Backend URL missing.");
        try {
            const {data} = await axios.get(backendUrl + '/api/course/all');

            if(data.success){
                setAllCourses(data.courses)
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    // Fetch user data
    const fetchUserData = async ()=>{

        if (!user || !backendUrl) 
            return; 
        
        if(user.publicMetadata?.role === 'educator'){ 
            setIsEducator(true)
        } else {
            setIsEducator(false)
        }

        try {
            const token = await getToken();

            const {data} = await axios.get(backendUrl + '/api/user/data', {headers: {Authorization: `Bearer ${token}`}})

            if(data.success){
                setUserData(data.user)
            }else{
                toast.error("User Not Found in DB: " + data.message); 
                setUserData(null);
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    // Function to calculate average rating of course
    const calculateRating = (course)=>{
        if(course.courseRatings.length === 0){
            return 0;
        }
        let totalRating = 0
        course.courseRatings.forEach(rating => {
            totalRating += rating.rating
        })
        return Math.floor(totalRating / course.courseRatings.length)
    }

    // Function to calculate course chapter time
    const calculateChapterTime = (chapter)=>{
        let time = 0
        chapter.chapterContent.map((lecture)=> time += lecture. lectureDuration)
        return humanizeDuration(time * 60 * 1000, {units: ['h', 'm']})
    }

    // Function to calculate course duration
    const calculateCourseDuration = (course)=>{
        let time = 0
        course.courseContent.map((chapter)=> chapter.chapterContent.map((lecture)=> time += lecture. lectureDuration))
        return humanizeDuration(time * 60 * 1000, {units: ['h', 'm']})
    }

    // Function to calculate no. of lectures in a course
    const calculateNoOfLectures = (course)=>{
        let totallectures = 0
        course.courseContent.forEach(chapter => {
            if (Array.isArray(chapter.chapterContent)) {
                totallectures += chapter.chapterContent.length
            }
        })
        return totallectures
    }

    //Fetch user enrolled courses
    const fetchUserEnrolledCourses = async ()=>{
        if (!user || !backendUrl) 
            return;
        try{
            const token = await getToken();
            const { data } = await axios.get(backendUrl + '/api/user/enrolled-courses',{headers: { Authorization: `Bearer ${token}`}})

            if(data.success){
                setEnrolledCourses(data.enrolledCourses.reverse())
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    useEffect(() => {
        fetchAllCourses();
    }, []);

    useEffect(()=>{
        if(user){
            fetchUserData()
            fetchUserEnrolledCourses()
        }else{
            setUserData(null);
            setIsEducator(false);
            setEnrolledCourses([]);
        }
    },[user])

    const value = {
        currency, allCourses, navigate, calculateRating, isEducator, setIsEducator, calculateChapterTime, calculateCourseDuration, calculateNoOfLectures, enrolledCourses, fetchUserEnrolledCourses, backendUrl, userData, setUserData, getToken, fetchAllCourses
    };
    
    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    );
}
