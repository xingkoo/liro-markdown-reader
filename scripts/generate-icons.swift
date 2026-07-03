#!/usr/bin/swift

import AppKit
import Foundation

let fileManager = FileManager.default
let repoRoot = URL(fileURLWithPath: fileManager.currentDirectoryPath)
let iconsDir = repoRoot.appendingPathComponent("src-tauri/icons", isDirectory: true)

try fileManager.createDirectory(at: iconsDir, withIntermediateDirectories: true)

let canvasSize = NSSize(width: 1024, height: 1024)
let image = NSImage(size: canvasSize)
image.lockFocus()

guard let context = NSGraphicsContext.current?.cgContext else {
  fatalError("Unable to create graphics context")
}

let backgroundColors = [
  NSColor(calibratedRed: 0.05, green: 0.10, blue: 0.18, alpha: 1).cgColor,
  NSColor(calibratedRed: 0.08, green: 0.52, blue: 0.96, alpha: 1).cgColor
] as CFArray
let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: backgroundColors, locations: [0, 1])!
context.drawLinearGradient(
  gradient,
  start: CGPoint(x: 0, y: 0),
  end: CGPoint(x: 1024, y: 1024),
  options: []
)

let cardRect = CGRect(x: 164, y: 140, width: 696, height: 744)
let cardPath = NSBezierPath(roundedRect: cardRect, xRadius: 88, yRadius: 88)
NSColor(white: 1, alpha: 0.15).setFill()
cardPath.fill()

let pageRect = CGRect(x: 284, y: 214, width: 456, height: 592)
let pagePath = NSBezierPath(roundedRect: pageRect, xRadius: 54, yRadius: 54)
NSColor.white.withAlphaComponent(0.92).setFill()
pagePath.fill()

let topBar = NSBezierPath(roundedRect: CGRect(x: 326, y: 694, width: 372, height: 44), xRadius: 22, yRadius: 22)
NSColor(calibratedRed: 0.92, green: 0.95, blue: 0.99, alpha: 1).setFill()
topBar.fill()

let accentBar = NSBezierPath(roundedRect: CGRect(x: 326, y: 270, width: 284, height: 20), xRadius: 10, yRadius: 10)
NSColor(calibratedRed: 0.04, green: 0.43, blue: 0.90, alpha: 1).setFill()
accentBar.fill()

let lineColor = NSColor(calibratedWhite: 0.86, alpha: 1)
for index in 0..<6 {
  let y = CGFloat(622 - index * 72)
  let line = NSBezierPath(roundedRect: CGRect(x: 332, y: y, width: 312 - CGFloat(index % 2) * 44, height: 16), xRadius: 8, yRadius: 8)
  lineColor.setFill()
  line.fill()
}

let monogramAttributes: [NSAttributedString.Key: Any] = [
  .font: NSFont.systemFont(ofSize: 300, weight: .heavy),
  .foregroundColor: NSColor.white
]
let monogram = "M"
let monogramSize = monogram.size(withAttributes: monogramAttributes)
monogram.draw(
  at: CGPoint(x: 512 - monogramSize.width / 2, y: 458 - monogramSize.height / 2),
  withAttributes: monogramAttributes
)

image.unlockFocus()

guard
  let tiff = image.tiffRepresentation,
  let bitmap = NSBitmapImageRep(data: tiff),
  let pngData = bitmap.representation(using: .png, properties: [:])
else {
  fatalError("Unable to create PNG data")
}

let sourcePNG = iconsDir.appendingPathComponent("icon-1024.png")
try pngData.write(to: sourcePNG)
print(sourcePNG.path)
