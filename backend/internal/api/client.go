package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

type APIClient struct {
	baseURL    string
	httpClient *http.Client
	token      string
}

func NewAPIClient(baseURL string) *APIClient {
	return &APIClient{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * 1000000000,
		},
	}
}

func (ac *APIClient) SetToken(token string) {
	ac.token = token
}

func (ac *APIClient) Do(ctx context.Context, method, path string, body interface{}, result interface{}) error {
	url := ac.baseURL + path

	var bodyReader io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal request body: %w", err)
		}
		bodyReader = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, bodyReader)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if ac.token != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", ac.token))
	}

	resp, err := ac.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to execute request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		errBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("API error: status=%d, body=%s", resp.StatusCode, string(errBody))
	}

	if result != nil && resp.ContentLength > 0 {
		if err := json.NewDecoder(resp.Body).Decode(result); err != nil {
			return fmt.Errorf("failed to decode response: %w", err)
		}
	}

	return nil
}

func (ac *APIClient) Get(ctx context.Context, path string, result interface{}) error {
	return ac.Do(ctx, http.MethodGet, path, nil, result)
}

func (ac *APIClient) Post(ctx context.Context, path string, body, result interface{}) error {
	return ac.Do(ctx, http.MethodPost, path, body, result)
}

func (ac *APIClient) Put(ctx context.Context, path string, body, result interface{}) error {
	return ac.Do(ctx, http.MethodPut, path, body, result)
}

func (ac *APIClient) Delete(ctx context.Context, path string) error {
	return ac.Do(ctx, http.MethodDelete, path, nil, nil)
}
