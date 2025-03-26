import React from 'react';
import { renderWithProviders, screen } from '../../utils/test-utils';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders correctly with default props', () => {
    renderWithProviders(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button).toHaveClass('inline-flex items-center justify-center rounded-md');
  });

  it('renders as disabled when disabled prop is true', () => {
    renderWithProviders(<Button disabled>Disabled Button</Button>);
    
    const button = screen.getByRole('button', { name: /disabled button/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('applies variant classes correctly', () => {
    renderWithProviders(
      <>
        <Button variant="default">Default</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </>
    );
    
    const defaultButton = screen.getByRole('button', { name: /default/i });
    const destructiveButton = screen.getByRole('button', { name: /destructive/i });
    const outlineButton = screen.getByRole('button', { name: /outline/i });
    const secondaryButton = screen.getByRole('button', { name: /secondary/i });
    const ghostButton = screen.getByRole('button', { name: /ghost/i });
    const linkButton = screen.getByRole('button', { name: /link/i });
    
    expect(defaultButton).toHaveClass('bg-primary');
    expect(destructiveButton).toHaveClass('bg-destructive');
    expect(outlineButton).toHaveClass('border');
    expect(secondaryButton).toHaveClass('bg-secondary');
    expect(ghostButton).toHaveClass('hover:bg-accent');
    expect(linkButton).toHaveClass('text-primary');
  });

  it('applies size classes correctly', () => {
    renderWithProviders(
      <>
        <Button size="default">Default Size</Button>
        <Button size="sm">Small Size</Button>
        <Button size="lg">Large Size</Button>
        <Button size="icon">Icon</Button>
      </>
    );
    
    const defaultSizeButton = screen.getByRole('button', { name: /default size/i });
    const smallSizeButton = screen.getByRole('button', { name: /small size/i });
    const largeSizeButton = screen.getByRole('button', { name: /large size/i });
    const iconButton = screen.getByRole('button', { name: /icon/i });
    
    expect(defaultSizeButton).toHaveClass('h-10 px-4 py-2');
    expect(smallSizeButton).toHaveClass('h-9 px-3');
    expect(largeSizeButton).toHaveClass('h-11 px-8');
    expect(iconButton).toHaveClass('h-10 w-10');
  });

  it('can be rendered as a different element', () => {
    renderWithProviders(
      <Button asChild>
        <a href="https://example.com">Link Button</a>
      </Button>
    );
    
    const linkButton = screen.getByRole('link', { name: /link button/i });
    expect(linkButton).toBeInTheDocument();
    expect(linkButton.tagName).toBe('A');
    expect(linkButton).toHaveAttribute('href', 'https://example.com');
    expect(linkButton).toHaveClass('inline-flex items-center justify-center rounded-md');
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = jest.fn();
    const { user } = renderWithProviders(
      <Button onClick={handleClick}>Clickable</Button>
    );
    
    const button = screen.getByRole('button', { name: /clickable/i });
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handleClick = jest.fn();
    const { user } = renderWithProviders(
      <Button disabled onClick={handleClick}>
        Disabled
      </Button>
    );
    
    const button = screen.getByRole('button', { name: /disabled/i });
    await user.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });
}); 