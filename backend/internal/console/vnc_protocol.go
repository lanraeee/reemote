package console

import (
	"bytes"
	"encoding/binary"
	"fmt"
	"io"
)

type PixelFormat struct {
	BitsPerPixel  uint8
	Depth         uint8
	BigEndian     uint8
	TrueColor     uint8
	RedMax        uint16
	GreenMax      uint16
	BlueMax       uint16
	RedShift      uint8
	GreenShift    uint8
	BlueShift     uint8
	Padding       [3]uint8
}

type VNCClientInit struct {
	SharedFlag uint8
}

type VNCServerInit struct {
	Width       uint16
	Height      uint16
	PixelFormat PixelFormat
	NameLen     uint32
	Name        string
}

type FramebufferUpdateRequest struct {
	Type             uint8
	Incremental      uint8
	XPos             uint16
	YPos             uint16
	Width            uint16
	Height           uint16
}

type Rectangle struct {
	XPos      uint16
	YPos      uint16
	Width     uint16
	Height    uint16
	Encoding  int32
	Data      []byte
}

type FramebufferUpdate struct {
	Type       uint8
	Padding    uint8
	NumRects   uint16
	Rectangles []*Rectangle
}

type KeyEvent struct {
	Type      uint8
	DownFlag  uint8
	Padding   [2]uint8
	Key       uint32
}

type PointerEvent struct {
	Type       uint8
	ButtonMask uint8
	XPos       uint16
	YPos       uint16
}

type ClientCutText struct {
	Type      uint8
	Padding   [3]uint8
	Length    uint32
	Text      []byte
}

const (
	FramebufferUpdateMsg   = 0
	SetColorMapEntriesMsg  = 1
	BellMsg                = 2
	ServerCutTextMsg       = 3
	ClientSetPixelFormatMsg = 0
	ClientSetEncodingsMsg   = 2
	ClientFramebufferUpdateReqMsg = 3
	ClientKeyEventMsg       = 4
	ClientPointerEventMsg   = 5
	ClientCutTextMsg        = 6

	EncodingRaw           = 0
	EncodingCopyRect      = 1
	EncodingRRE           = 2
	EncodingCoRRE         = 4
	EncodingHextile       = 5
	EncodingZLIB          = 6
	EncodingTight         = 7
	EncodingZLIBHex       = 8
	EncodingTRLE          = 15
	EncodingZRLE          = 16
	EncodingJPEG          = 21
	EncodingPseudoCursor  = -239
	EncodingPseudoDesktopSize = -223
)

type VNCProtocol struct {
	reader io.Reader
	writer io.Writer
	buf    *bytes.Buffer
}

func NewVNCProtocol(reader io.Reader, writer io.Writer) *VNCProtocol {
	return &VNCProtocol{
		reader: reader,
		writer: writer,
		buf:    new(bytes.Buffer),
	}
}

func (vp *VNCProtocol) WriteServerInit(init *VNCServerInit) error {
	buf := new(bytes.Buffer)

	binary.Write(buf, binary.BigEndian, init.Width)
	binary.Write(buf, binary.BigEndian, init.Height)
	binary.Write(buf, binary.BigEndian, init.PixelFormat)

	nameLen := uint32(len(init.Name))
	binary.Write(buf, binary.BigEndian, nameLen)
	buf.WriteString(init.Name)

	_, err := io.Copy(vp.writer, buf)
	return err
}

func (vp *VNCProtocol) ReadClientInit() (*VNCClientInit, error) {
	var init VNCClientInit
	err := binary.Read(vp.reader, binary.BigEndian, &init.SharedFlag)
	return &init, err
}

func (vp *VNCProtocol) ReadClientMessage() (interface{}, error) {
	var msgType uint8
	if err := binary.Read(vp.reader, binary.BigEndian, &msgType); err != nil {
		return nil, err
	}

	switch msgType {
	case ClientSetPixelFormatMsg:
		return vp.readSetPixelFormat()
	case ClientSetEncodingsMsg:
		return vp.readSetEncodings()
	case ClientFramebufferUpdateReqMsg:
		return vp.readFramebufferUpdateRequest()
	case ClientKeyEventMsg:
		return vp.readKeyEvent()
	case ClientPointerEventMsg:
		return vp.readPointerEvent()
	case ClientCutTextMsg:
		return vp.readClientCutText()
	default:
		return nil, fmt.Errorf("unknown client message type: %d", msgType)
	}
}

func (vp *VNCProtocol) readSetPixelFormat() (*PixelFormat, error) {
	var padding [3]uint8
	if err := binary.Read(vp.reader, binary.BigEndian, &padding); err != nil {
		return nil, err
	}

	var pf PixelFormat
	if err := binary.Read(vp.reader, binary.BigEndian, &pf); err != nil {
		return nil, err
	}

	return &pf, nil
}

func (vp *VNCProtocol) readSetEncodings() ([]int32, error) {
	var padding [1]uint8
	if err := binary.Read(vp.reader, binary.BigEndian, &padding); err != nil {
		return nil, err
	}

	var numEncodings uint16
	if err := binary.Read(vp.reader, binary.BigEndian, &numEncodings); err != nil {
		return nil, err
	}

	encodings := make([]int32, numEncodings)
	for i := 0; i < int(numEncodings); i++ {
		if err := binary.Read(vp.reader, binary.BigEndian, &encodings[i]); err != nil {
			return nil, err
		}
	}

	return encodings, nil
}

func (vp *VNCProtocol) readFramebufferUpdateRequest() (*FramebufferUpdateRequest, error) {
	var req FramebufferUpdateRequest
	if err := binary.Read(vp.reader, binary.BigEndian, &req); err != nil {
		return nil, err
	}

	return &req, nil
}

func (vp *VNCProtocol) readKeyEvent() (*KeyEvent, error) {
	var event KeyEvent
	if err := binary.Read(vp.reader, binary.BigEndian, &event); err != nil {
		return nil, err
	}

	return &event, nil
}

func (vp *VNCProtocol) readPointerEvent() (*PointerEvent, error) {
	var event PointerEvent
	if err := binary.Read(vp.reader, binary.BigEndian, &event); err != nil {
		return nil, err
	}

	return &event, nil
}

func (vp *VNCProtocol) readClientCutText() (*ClientCutText, error) {
	var padding [3]uint8
	if err := binary.Read(vp.reader, binary.BigEndian, &padding); err != nil {
		return nil, err
	}

	var length uint32
	if err := binary.Read(vp.reader, binary.BigEndian, &length); err != nil {
		return nil, err
	}

	text := make([]byte, length)
	if _, err := io.ReadFull(vp.reader, text); err != nil {
		return nil, err
	}

	return &ClientCutText{
		Length: length,
		Text:   text,
	}, nil
}

func (vp *VNCProtocol) WriteFramebufferUpdate(update *FramebufferUpdate) error {
	buf := new(bytes.Buffer)

	binary.Write(buf, binary.BigEndian, update.Type)
	binary.Write(buf, binary.BigEndian, update.Padding)
	binary.Write(buf, binary.BigEndian, update.NumRects)

	for _, rect := range update.Rectangles {
		binary.Write(buf, binary.BigEndian, rect.XPos)
		binary.Write(buf, binary.BigEndian, rect.YPos)
		binary.Write(buf, binary.BigEndian, rect.Width)
		binary.Write(buf, binary.BigEndian, rect.Height)
		binary.Write(buf, binary.BigEndian, rect.Encoding)
		buf.Write(rect.Data)
	}

	_, err := io.Copy(vp.writer, buf)
	return err
}

func (vp *VNCProtocol) WriteServerCutText(text string) error {
	buf := new(bytes.Buffer)

	binary.Write(buf, binary.BigEndian, uint8(ServerCutTextMsg))
	binary.Write(buf, binary.BigEndian, [3]uint8{})
	binary.Write(buf, binary.BigEndian, uint32(len(text)))
	buf.WriteString(text)

	_, err := io.Copy(vp.writer, buf)
	return err
}

func (vp *VNCProtocol) WriteBell() error {
	return binary.Write(vp.writer, binary.BigEndian, uint8(BellMsg))
}
