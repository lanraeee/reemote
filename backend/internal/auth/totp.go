package auth

import (
	"fmt"

	"github.com/pquerna/otp"
	"github.com/pquerna/otp/totp"
)

type TOTPManager struct {
	windowSize int
}

func NewTOTPManager(windowSize int) *TOTPManager {
	return &TOTPManager{windowSize: windowSize}
}

func (tm *TOTPManager) GenerateSecret(email string) (string, string, error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      "Reemote",
		AccountName: email,
		Algorithm:   otp.AlgorithmSHA256,
		Period:      30,
		Digits:      otp.DigitsSix,
	})

	if err != nil {
		return "", "", fmt.Errorf("failed to generate TOTP secret: %w", err)
	}

	return key.Secret(), key.String(), nil
}

func (tm *TOTPManager) VerifyToken(secret, token string) bool {
	return totp.Validate(token, secret)
}

func (tm *TOTPManager) VerifyTokenWithWindow(secret, token string) bool {
	valid, err := totp.ValidateCustom(
		token,
		secret,
		int64(tm.windowSize),
		totp.ValidateOpts{
			Period: 30,
			Digits: otp.DigitsSix,
		},
	)
	if err != nil {
		return false
	}
	return valid
}
