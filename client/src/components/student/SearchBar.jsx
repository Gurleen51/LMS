import React, { useState } from 'react'
import { assets } from '../../assets/assets'
import { useNavigate } from 'react-router-dom'

const SearchBar = ({data}) => {

  const navigate = useNavigate()
  const [input, setInput] = useState(data ? data : '')

  const onSearchHandler = (e) => {
    e.preventDefault()
    navigate('/course-list/' + input)
  }

  return (
    <form onSubmit={onSearchHandler} className='max-w-xl w-full md:h-14 h-12 flex items-center bg-white border border-gray-300 rounded-lg'>
      <div className='flex items-center flex-grow h-full'>
        <img src={assets.search_icon} alt="search icon" className='w-5 h-5 ml-4 text-gray-400' />
        <input onChange={e => setInput(e.target.value)} value={input}
        type="text" placeholder='Search for courses' className='w-full h-full outline-none text-gray-800 px-3 text-sm md:text-base placeholder-gray-500'/>
      </div>
      <button type='submit' className='bg-blue-600 text-white font-medium md:px-12 px-10 py-3 rounded flex-shrink-0 mr-1.5 my-1'>Search</button>
    </form>
  )
}

export default SearchBar
