import { useState } from 'react'

export function useSectionFilter(allQuarters: string[]) {
  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedQuarter, setSelectedQuarter] = useState('all')

  const handleYearChange = (year: string) => {
    setSelectedYear(year)
    setSelectedQuarter('all')
  }

  return {
    selectedYear,
    selectedQuarter,
    setSelectedQuarter,
    handleYearChange,
  }
}
