import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { axe } from 'jest-axe'
import 'jest-axe/extend-expect'

// Mock component for testing
const AIOutputFormatting = ({ 
  output, 
  format = 'text',
  isLoading = false,
  error = null
}: { 
  output: any
  format?: 'text' | 'json' | 'list' | 'table'
  isLoading?: boolean
  error?: string | null
}) => {
  if (isLoading) {
    return <div data-testid="loading-indicator">Loading...</div>
  }
  
  if (error) {
    return <div data-testid="error-message" role="alert">{error}</div>
  }
  
  if (format === 'json') {
    try {
      // For testing, we'll handle both string JSON and object
      const jsonData = typeof output === 'string' ? JSON.parse(output) : output
      return (
        <pre data-testid="json-output" className="json-formatter">
          {JSON.stringify(jsonData, null, 2)}
        </pre>
      )
    } catch (err) {
      return <div data-testid="json-parse-error">Invalid JSON format</div>
    }
  }
  
  if (format === 'list') {
    const items = Array.isArray(output) ? output : [output]
    return (
      <ul data-testid="list-output">
        {items.map((item, index) => (
          <li key={index} data-testid={`list-item-${index}`}>
            {typeof item === 'object' ? JSON.stringify(item) : String(item)}
          </li>
        ))}
      </ul>
    )
  }
  
  if (format === 'table' && typeof output === 'object' && Array.isArray(output)) {
    return (
      <table data-testid="table-output">
        <thead>
          <tr>
            {Object.keys(output[0] || {}).map((key) => (
              <th key={key} data-testid={`table-header-${key}`}>{key}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {output.map((row, rowIndex) => (
            <tr key={rowIndex} data-testid={`table-row-${rowIndex}`}>
              {Object.values(row).map((cell, cellIndex) => (
                <td key={cellIndex} data-testid={`table-cell-${rowIndex}-${cellIndex}`}>
                  {typeof cell === 'object' ? JSON.stringify(cell) : String(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  
  // Default text format
  return <div data-testid="text-output">{String(output)}</div>
}

describe('AIOutputFormatting', () => {
  it('renders text output correctly', () => {
    render(<AIOutputFormatting output="This is a text response from the AI" />)
    
    expect(screen.getByTestId('text-output')).toHaveTextContent('This is a text response from the AI')
  })
  
  it('formats JSON output correctly', () => {
    const jsonData = {
      name: 'Workout Plan',
      exercises: [
        { name: 'Squats', sets: 3, reps: 10 },
        { name: 'Bench Press', sets: 3, reps: 8 }
      ]
    }
    
    render(<AIOutputFormatting output={jsonData} format="json" />)
    
    const jsonOutput = screen.getByTestId('json-output')
    expect(jsonOutput).toBeInTheDocument()
    expect(jsonOutput.textContent).toContain('Workout Plan')
    expect(jsonOutput.textContent).toContain('Squats')
    expect(jsonOutput.textContent).toContain('Bench Press')
  })
  
  it('handles JSON string input correctly', () => {
    const jsonString = JSON.stringify({
      name: 'Workout Plan',
      exercises: [
        { name: 'Squats', sets: 3, reps: 10 }
      ]
    })
    
    render(<AIOutputFormatting output={jsonString} format="json" />)
    
    const jsonOutput = screen.getByTestId('json-output')
    expect(jsonOutput).toBeInTheDocument()
    expect(jsonOutput.textContent).toContain('Workout Plan')
    expect(jsonOutput.textContent).toContain('Squats')
  })
  
  it('shows error message for invalid JSON', () => {
    const invalidJson = "{ name: 'Invalid JSON' }" // Missing quotes around property name
    
    render(<AIOutputFormatting output={invalidJson} format="json" />)
    
    expect(screen.getByTestId('json-parse-error')).toHaveTextContent('Invalid JSON format')
  })
  
  it('renders list output correctly', () => {
    const listItems = [
      'Warm-up: 5 minutes',
      'Exercise 1: Squats',
      'Exercise 2: Deadlifts',
      'Cool-down: 5 minutes stretching'
    ]
    
    render(<AIOutputFormatting output={listItems} format="list" />)
    
    const listOutput = screen.getByTestId('list-output')
    expect(listOutput).toBeInTheDocument()
    expect(listOutput.tagName).toBe('UL')
    expect(screen.getByTestId('list-item-0')).toHaveTextContent('Warm-up: 5 minutes')
    expect(screen.getByTestId('list-item-1')).toHaveTextContent('Exercise 1: Squats')
    expect(screen.getByTestId('list-item-2')).toHaveTextContent('Exercise 2: Deadlifts')
    expect(screen.getByTestId('list-item-3')).toHaveTextContent('Cool-down: 5 minutes stretching')
  })
  
  it('handles single item as list correctly', () => {
    render(<AIOutputFormatting output="Single item" format="list" />)
    
    const listOutput = screen.getByTestId('list-output')
    expect(listOutput).toBeInTheDocument()
    expect(screen.getByTestId('list-item-0')).toHaveTextContent('Single item')
    expect(screen.queryByTestId('list-item-1')).not.toBeInTheDocument()
  })
  
  it('renders table output correctly', () => {
    const tableData = [
      { exercise: 'Squats', sets: 3, reps: 10 },
      { exercise: 'Deadlifts', sets: 3, reps: 8 }
    ]
    
    render(<AIOutputFormatting output={tableData} format="table" />)
    
    const tableOutput = screen.getByTestId('table-output')
    expect(tableOutput).toBeInTheDocument()
    expect(tableOutput.tagName).toBe('TABLE')
    
    // Check headers
    expect(screen.getByTestId('table-header-exercise')).toHaveTextContent('exercise')
    expect(screen.getByTestId('table-header-sets')).toHaveTextContent('sets')
    expect(screen.getByTestId('table-header-reps')).toHaveTextContent('reps')
    
    // Check rows
    expect(screen.getByTestId('table-row-0')).toBeInTheDocument()
    expect(screen.getByTestId('table-cell-0-0')).toHaveTextContent('Squats')
    expect(screen.getByTestId('table-cell-0-1')).toHaveTextContent('3')
    expect(screen.getByTestId('table-cell-0-2')).toHaveTextContent('10')
    
    expect(screen.getByTestId('table-row-1')).toBeInTheDocument()
    expect(screen.getByTestId('table-cell-1-0')).toHaveTextContent('Deadlifts')
    expect(screen.getByTestId('table-cell-1-1')).toHaveTextContent('3')
    expect(screen.getByTestId('table-cell-1-2')).toHaveTextContent('8')
  })
  
  it('shows loading indicator when isLoading is true', () => {
    render(<AIOutputFormatting output="This will not be displayed" isLoading={true} />)
    
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    expect(screen.getByTestId('loading-indicator')).toHaveTextContent('Loading...')
    expect(screen.queryByTestId('text-output')).not.toBeInTheDocument()
  })
  
  it('shows error message when error is provided', () => {
    render(
      <AIOutputFormatting 
        output="This will not be displayed" 
        error="Failed to generate AI response"
      />
    )
    
    expect(screen.getByTestId('error-message')).toBeInTheDocument()
    expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to generate AI response')
    expect(screen.queryByTestId('text-output')).not.toBeInTheDocument()
  })
  
  it('prioritizes loading state over error state', () => {
    render(
      <AIOutputFormatting 
        output="This will not be displayed" 
        isLoading={true}
        error="This error will not be displayed"
      />
    )
    
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
    expect(screen.queryByTestId('error-message')).not.toBeInTheDocument()
    expect(screen.queryByTestId('text-output')).not.toBeInTheDocument()
  })
  
  it('converts complex objects to strings in text format', () => {
    const complexObject = { key: 'value', nested: { prop: true } }
    
    render(<AIOutputFormatting output={complexObject} />)
    
    expect(screen.getByTestId('text-output')).toHaveTextContent('[object Object]')
  })
  
  it('has no accessibility violations', async () => {
    const { container } = render(
      <AIOutputFormatting
        output={[
          { exercise: 'Squats', sets: 3, reps: 10 },
          { exercise: 'Deadlifts', sets: 3, reps: 8 }
        ]}
        format="table"
      />
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
}) 