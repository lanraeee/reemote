package console

import (
	"bytes"
	"compress/flate"
	"compress/zlib"
	"fmt"
	"io"
)

type CompressionType int

const (
	CompressionNone CompressionType = iota
	CompressionZLIB
	CompressionDeflate
)

type FrameCompressor struct {
	compressionType CompressionType
	level           int
	buf             *bytes.Buffer
}

func NewFrameCompressor(compressionType CompressionType, level int) *FrameCompressor {
	if level < 1 || level > 9 {
		level = 6
	}

	return &FrameCompressor{
		compressionType: compressionType,
		level:           level,
		buf:             new(bytes.Buffer),
	}
}

func (fc *FrameCompressor) Compress(data []byte) ([]byte, error) {
	switch fc.compressionType {
	case CompressionNone:
		return data, nil
	case CompressionZLIB:
		return fc.compressZLIB(data)
	case CompressionDeflate:
		return fc.compressDeflate(data)
	default:
		return nil, fmt.Errorf("unknown compression type: %d", fc.compressionType)
	}
}

func (fc *FrameCompressor) Decompress(data []byte) ([]byte, error) {
	switch fc.compressionType {
	case CompressionNone:
		return data, nil
	case CompressionZLIB:
		return fc.decompressZLIB(data)
	case CompressionDeflate:
		return fc.decompressDeflate(data)
	default:
		return nil, fmt.Errorf("unknown compression type: %d", fc.compressionType)
	}
}

func (fc *FrameCompressor) compressZLIB(data []byte) ([]byte, error) {
	fc.buf.Reset()

	w, err := zlib.NewWriterLevel(fc.buf, fc.level)
	if err != nil {
		return nil, fmt.Errorf("failed to create zlib writer: %w", err)
	}

	if _, err := w.Write(data); err != nil {
		return nil, fmt.Errorf("failed to compress data: %w", err)
	}

	if err := w.Close(); err != nil {
		return nil, fmt.Errorf("failed to close zlib writer: %w", err)
	}

	return fc.buf.Bytes(), nil
}

func (fc *FrameCompressor) compressDeflate(data []byte) ([]byte, error) {
	fc.buf.Reset()

	w, err := flate.NewWriter(fc.buf, fc.level)
	if err != nil {
		return nil, fmt.Errorf("failed to create deflate writer: %w", err)
	}

	if _, err := w.Write(data); err != nil {
		return nil, fmt.Errorf("failed to compress data: %w", err)
	}

	if err := w.Close(); err != nil {
		return nil, fmt.Errorf("failed to close deflate writer: %w", err)
	}

	return fc.buf.Bytes(), nil
}

func (fc *FrameCompressor) decompressZLIB(data []byte) ([]byte, error) {
	r, err := zlib.NewReader(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("failed to create zlib reader: %w", err)
	}
	defer r.Close()

	fc.buf.Reset()
	if _, err := io.Copy(fc.buf, r); err != nil {
		return nil, fmt.Errorf("failed to decompress data: %w", err)
	}

	return fc.buf.Bytes(), nil
}

func (fc *FrameCompressor) decompressDeflate(data []byte) ([]byte, error) {
	r := flate.NewReader(bytes.NewReader(data))
	defer r.Close()

	fc.buf.Reset()
	if _, err := io.Copy(fc.buf, r); err != nil {
		return nil, fmt.Errorf("failed to decompress data: %w", err)
	}

	return fc.buf.Bytes(), nil
}

type CompressionStats struct {
	TotalOriginalBytes   int64
	TotalCompressedBytes int64
	CompressionRatio     float64
	TimeSpent            int64
}

type AdaptiveCompressor struct {
	compressor *FrameCompressor
	stats      *CompressionStats
}

func NewAdaptiveCompressor(initialLevel int) *AdaptiveCompressor {
	return &AdaptiveCompressor{
		compressor: NewFrameCompressor(CompressionZLIB, initialLevel),
		stats: &CompressionStats{},
	}
}

func (ac *AdaptiveCompressor) CompressFrame(frame []byte) ([]byte, error) {
	compressed, err := ac.compressor.Compress(frame)
	if err != nil {
		return nil, err
	}

	ac.stats.TotalOriginalBytes += int64(len(frame))
	ac.stats.TotalCompressedBytes += int64(len(compressed))

	if ac.stats.TotalOriginalBytes > 0 {
		ac.stats.CompressionRatio = float64(ac.stats.TotalCompressedBytes) / float64(ac.stats.TotalOriginalBytes)
	}

	return compressed, nil
}

func (ac *AdaptiveCompressor) DecompressFrame(frame []byte) ([]byte, error) {
	return ac.compressor.Decompress(frame)
}

func (ac *AdaptiveCompressor) GetStats() *CompressionStats {
	return &CompressionStats{
		TotalOriginalBytes:   ac.stats.TotalOriginalBytes,
		TotalCompressedBytes: ac.stats.TotalCompressedBytes,
		CompressionRatio:     ac.stats.CompressionRatio,
	}
}

func (ac *AdaptiveCompressor) AdjustCompressionLevel(newLevel int) {
	if newLevel < 1 || newLevel > 9 {
		return
	}

	ac.compressor.level = newLevel
}

type BandwidthOptimizer struct {
	compressor *AdaptiveCompressor
	maxFrameSize int
	targetBitrate int64
}

func NewBandwidthOptimizer(targetBitrate int64) *BandwidthOptimizer {
	return &BandwidthOptimizer{
		compressor:    NewAdaptiveCompressor(6),
		maxFrameSize:  65536,
		targetBitrate: targetBitrate,
	}
}

func (bo *BandwidthOptimizer) OptimizeFrame(frame []byte) ([]byte, error) {
	if len(frame) > bo.maxFrameSize {
		return nil, fmt.Errorf("frame exceeds max size: %d > %d", len(frame), bo.maxFrameSize)
	}

	return bo.compressor.CompressFrame(frame)
}

func (bo *BandwidthOptimizer) AdjustQuality(bytesPerSecond int64) {
	ratio := float64(bytesPerSecond) / float64(bo.targetBitrate)

	if ratio > 1.5 {
		bo.compressor.AdjustCompressionLevel(9)
	} else if ratio > 1.2 {
		bo.compressor.AdjustCompressionLevel(8)
	} else if ratio > 0.8 {
		bo.compressor.AdjustCompressionLevel(6)
	} else if ratio < 0.5 {
		bo.compressor.AdjustCompressionLevel(1)
	}
}

func (bo *BandwidthOptimizer) GetCompressionRatio() float64 {
	return bo.compressor.GetStats().CompressionRatio
}
