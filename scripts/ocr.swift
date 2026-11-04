import Foundation
import PDFKit
import Vision

guard CommandLine.arguments.count > 1 else {
    fputs("Usage: ocr <pdf-path>\n", stderr)
    exit(1)
}

let path = CommandLine.arguments[1]
let url = URL(fileURLWithPath: path)
guard let document = PDFDocument(url: url) else {
    fputs("Error: Could not load PDF at \(path)\n", stderr)
    exit(1)
}

var fullText = ""

for i in 0..<document.pageCount {
    guard let page = document.page(at: i) else { continue }
    let pageRect = page.bounds(for: .mediaBox)
    let size = CGSize(width: max(pageRect.width * 2, 1200), height: max(pageRect.height * 2, 1200))
    let nsImage = page.thumbnail(of: size, for: .mediaBox)
    guard let cgImage = nsImage.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }

    let requestHandler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    let request = VNRecognizeTextRequest { req, err in
        guard let observations = req.results as? [VNRecognizedTextObservation] else { return }
        let text = observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
        fullText += "\n--- Page \(i + 1) ---\n" + text + "\n"
    }
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    try? requestHandler.perform([request])
}

print(fullText.trimmingCharacters(in: .whitespacesAndNewlines))
