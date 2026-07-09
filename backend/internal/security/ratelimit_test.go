package security

import (
	"testing"
	"time"
)

func TestTokenBucket_AllowRequest(t *testing.T) {
	bucket := NewTokenBucket()

	tests := []struct {
		name        string
		identifier  string
		maxRequests int
		window      time.Duration
		requests    int
		expected    int // expected allowed requests
	}{
		{
			name:        "allow within limit",
			identifier:  "user1",
			maxRequests: 5,
			window:      time.Second,
			requests:    3,
			expected:    3,
		},
		{
			name:        "deny above limit",
			identifier:  "user2",
			maxRequests: 2,
			window:      time.Second,
			requests:    5,
			expected:    2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			allowed := 0
			for i := 0; i < tt.requests; i++ {
				if bucket.AllowRequest(tt.identifier, tt.maxRequests, tt.window) {
					allowed++
				}
			}
			if allowed != tt.expected {
				t.Errorf("expected %d allowed, got %d", tt.expected, allowed)
			}
		})
	}
}

func TestTokenBucket_Refill(t *testing.T) {
	bucket := NewTokenBucket()

	// First request should always pass
	if !bucket.AllowRequest("user", 1, time.Millisecond) {
		t.Fatal("first request should be allowed")
	}

	// Second request should fail immediately
	if bucket.AllowRequest("user", 1, time.Millisecond) {
		t.Fatal("second request should be denied")
	}

	// Wait for refill
	time.Sleep(2 * time.Millisecond)

	// Request should be allowed after refill
	if !bucket.AllowRequest("user", 1, time.Millisecond) {
		t.Fatal("request should be allowed after refill")
	}
}

func TestRateLimiter_AllowUser(t *testing.T) {
	limiter := NewRateLimiter(2, 10, time.Second)

	// First 2 requests should pass
	if !limiter.AllowUser("user1") {
		t.Fatal("first user request should be allowed")
	}
	if !limiter.AllowUser("user1") {
		t.Fatal("second user request should be allowed")
	}

	// Third request should fail
	if limiter.AllowUser("user1") {
		t.Fatal("third user request should be denied")
	}
}

func TestRateLimiter_AllowIP(t *testing.T) {
	limiter := NewRateLimiter(10, 2, time.Second)

	// First 2 requests should pass
	if !limiter.AllowIP("192.168.1.1") {
		t.Fatal("first IP request should be allowed")
	}
	if !limiter.AllowIP("192.168.1.1") {
		t.Fatal("second IP request should be allowed")
	}

	// Third request should fail
	if limiter.AllowIP("192.168.1.1") {
		t.Fatal("third IP request should be denied")
	}
}

func TestRateLimiter_Allow(t *testing.T) {
	limiter := NewRateLimiter(1, 2, time.Second)

	// User limit exceeded
	limiter.AllowUser("user1")
	allowed, msg := limiter.Allow("user1", "192.168.1.1")
	if allowed {
		t.Fatal("request should be denied due to user limit")
	}
	if msg == "" {
		t.Fatal("error message should not be empty")
	}

	// IP limit exceeded
	limiter2 := NewRateLimiter(100, 1, time.Second)
	limiter2.AllowIP("192.168.1.2")
	allowed, msg = limiter2.Allow("user2", "192.168.1.2")
	if allowed {
		t.Fatal("request should be denied due to IP limit")
	}
	if msg == "" {
		t.Fatal("error message should not be empty")
	}
}

func TestTokenBucket_Cleanup(t *testing.T) {
	bucket := NewTokenBucket()

	// Create some buckets
	bucket.AllowRequest("user1", 5, time.Second)
	bucket.AllowRequest("user2", 5, time.Second)

	if len(bucket.buckets) != 2 {
		t.Fatalf("expected 2 buckets, got %d", len(bucket.buckets))
	}

	// Cleanup with short max age
	bucket.Cleanup(100 * time.Millisecond)

	// Wait for buckets to expire
	time.Sleep(150 * time.Millisecond)
	bucket.Cleanup(100 * time.Millisecond)

	if len(bucket.buckets) != 0 {
		t.Fatalf("expected 0 buckets after cleanup, got %d", len(bucket.buckets))
	}
}
