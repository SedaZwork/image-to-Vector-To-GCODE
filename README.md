# Image to G-Code Converter

A modern web application that converts images to CNC-ready G-code using customizable halftone patterns. Built with Next.js, TypeScript, and Tailwind CSS.

## 🌟 Features

- **Image Upload**: Support for JPEG, PNG, WebP, GIF, and BMP formats with drag-and-drop functionality
- **Halftone Processing**: Multiple algorithms for converting images to halftone patterns
  - Floyd-Steinberg error diffusion
  - Ordered dithering
  - Simple threshold
- **Real-time Preview**: Live preview of halftone processing and G-code visualization
- **Customizable Parameters**: Fine-tune dot size, spacing, threshold, and output dimensions
- **G-Code Generation**: Professional CNC-ready output with customizable machine settings
- **Export Options**: Download G-code files or copy to clipboard
- **Responsive Design**: Works seamlessly across desktop and mobile devices
- **Workflow Guidance**: Step-by-step guided process from upload to export
- **Keyboard Shortcuts**: Power user features for faster workflow
- **Error Handling**: Comprehensive validation and user-friendly error messages

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Modern web browser with HTML5 canvas support

### Installation

1. Clone the repository:
```bash
git clone git@github.com:terrymccann/image-to-gcode.git
cd image-to-gcode
```

2. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## 📋 Usage

### Basic Workflow

1. **Upload Image**: Drag and drop or browse to select an image file
2. **Configure Parameters**: Adjust halftone settings and output dimensions
3. **Preview & Generate**: Review the halftone pattern and generate G-code
4. **Export**: Download or copy the generated G-code

### Parameter Reference

#### Halftone Parameters

- **Algorithm**: Choose conversion method
  - **Floyd-Steinberg**: Best for photographs and complex images with gradients
  - **Ordered Dithering**: Ideal for clean geometric patterns and technical drawings
  - **Simple Threshold**: Perfect for high contrast images and artistic effects

- **Dot Size (1-20px)**: Controls the maximum size of halftone dots
- **Dot Spacing (1-10px)**: Distance between dot centers (lower = denser pattern)
- **Threshold (0-255)**: Brightness threshold for dot creation (0 = black, 255 = white)
- **Invert Colors**: Create dots in bright areas instead of dark areas

#### Output Settings

- **Units**: Choose between millimeters (mm) or inches
- **Canvas Dimensions**: Physical size of the output material

### Keyboard Shortcuts

- **Ctrl/Cmd + U**: Upload image (when on upload step)
- **Ctrl/Cmd + G**: Generate G-code
- **Ctrl/Cmd + E**: Export G-code
- **Ctrl/Cmd + H**: Show help panel
- **Ctrl/Cmd + R**: Reset application (with confirmation)

## 🔧 Technical Details

### Architecture

The application follows a modular architecture with clear separation of concerns:

```
src/
├── app/                    # Next.js app router pages
├── components/             # React components
│   ├── halftone/          # Feature-specific components
│   └── ui/                # Reusable UI components (shadcn/ui)
├── hooks/                 # Custom React hooks
├── lib/                   # Core libraries and utilities
├── types/                 # TypeScript type definitions
└── workers/               # Web Workers for heavy processing
```

### Key Components

- **ImageUpload**: Handles file selection with validation and drag-and-drop
- **ParameterControls**: Real-time parameter adjustment with validation
- **ImagePreview**: Live preview of original and processed images
- **GCodePreview**: Visualization of generated G-code patterns
- **ExportPanel**: G-code export with multiple format options

### Processing Pipeline

1. **Image Loading**: File validation and image preprocessing
2. **Halftone Generation**: Convert image to halftone pattern using selected algorithm
3. **G-Code Generation**: Transform halftone data into CNC-compatible G-code
4. **Export**: Format and deliver the final G-code file

### Supported Image Formats

- **JPEG/JPG**: Standard compressed images
- **PNG**: Images with transparency support
- **WebP**: Modern compressed format
- **GIF**: Animated and static images
- **BMP**: Uncompressed bitmap images

**File Size Limits:**
- Maximum: 50MB per file
- Recommended: Under 10MB for optimal performance
- Image dimensions: 10x10 to 10,000x10,000 pixels

## 🛠️ Development

### Project Structure

```typescript
// Core types
interface HalftoneOptions {
  dotSize: number;          // 1-20px
  spacing: number;          // 1-10px  
  threshold: number;        // 0-255
  algorithm: 'floyd-steinberg' | 'ordered' | 'random';
  invert: boolean;
}

```

### Key Hooks

- **useHalftoneProcessor**: Core processing logic with state management
- **useGlobalShortcuts**: Keyboard shortcut handling
- **useHelpPanel**: Help system state management

### Performance Optimizations

- **Web Workers**: Heavy image processing runs in background threads
- **Canvas Processing**: Hardware-accelerated image manipulation
- **Debounced Updates**: Parameter changes are batched to prevent excessive re-rendering
- **Lazy Loading**: Components load only when needed
- **Memory Management**: Automatic cleanup of image blobs and canvas contexts

### Adding New Algorithms

To add a new halftone algorithm:

1. Extend the `HalftoneOptions['algorithm']` type in `src/types/index.ts`
2. Implement the algorithm in `src/lib/halftoneConverter.ts`
3. Add algorithm info to `ALGORITHM_INFO` in `ParameterControls.tsx`
4. Update validation in `src/lib/validation.ts`

## 🎨 UI/UX Features

### Design System

- **shadcn/ui**: Modern, accessible component library
- **Tailwind CSS**: Utility-first styling with custom configuration
- **Lucide Icons**: Consistent iconography throughout the application
- **Responsive Layout**: Mobile-first design with desktop enhancements

### Accessibility

- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: WCAG 2.1 AA compliant color schemes
- **Focus Management**: Clear focus indicators and logical tab order

### Error Handling

- **Validation**: Real-time parameter validation with helpful messages
- **Error Boundaries**: Graceful handling of component errors
- **File Validation**: Comprehensive file type and size checking
- **User Feedback**: Clear error messages and recovery suggestions

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to [Vercel](https://vercel.com)
3. Deploy automatically on every push

### Other Platforms

The application can be deployed to any platform that supports Node.js:

- **Netlify**: Configure build command as `npm run build` and publish directory as `out`
- **AWS Amplify**: Use the Next.js build settings
- **Docker**: Use the provided Dockerfile for containerized deployment

### Environment Variables

No environment variables are required for basic functionality. The application runs entirely client-side for maximum privacy and performance.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines before submitting pull requests.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a pull request

### Reporting Issues

Please use the GitHub issues tracker to report bugs or request features. Include:

- Detailed description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser and device information
- Screenshots if applicable

## 🔍 Troubleshooting

### Common Issues

**Image upload fails with "Unsupported file type"**
- Ensure the file has a valid image extension (.jpg, .png, etc.)
- Try converting the image to a standard format
- Check that the file isn't corrupted

**Performance issues with large images**
- Reduce image size before upload
- Use JPEG format for photographs
- Consider using WebP for better compression

**G-code generation fails**
- Check that all parameters are within valid ranges
- Ensure the canvas dimensions are reasonable
- Try reducing the image complexity

**Browser compatibility issues**
- Use a modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- Enable JavaScript and HTML5 features
- Check for browser extensions that might interfere

### Getting Help

- Check the built-in help panel (Ctrl/Cmd + H)
- Review this documentation
- Search existing GitHub issues
- Create a new issue with detailed information

## 🏗️ Roadmap

### Planned Features

- [ ] Additional halftone algorithms (Atkinson, Sierra)
- [ ] Vector output formats (SVG, DXF)
- [ ] Batch processing for multiple images
- [ ] Custom machine profiles and presets
- [ ] Advanced G-code optimization
- [ ] Material-specific toolpath generation
- [ ] Cloud storage integration
- [ ] Collaborative sharing features

### Version History

- **v0.1.0**: Initial release with core functionality
  - Image upload and processing
  - Three halftone algorithms
  - G-code generation and export
  - Responsive web interface

---

Built with ❤️ using Next.js, TypeScript, and modern web technologies.