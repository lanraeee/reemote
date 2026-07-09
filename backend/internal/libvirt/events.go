package libvirt

import (
	"context"
	"fmt"
	"sync"
	"time"
)

type EventType string

const (
	EventDomainStarted   EventType = "domain_started"
	EventDomainStopped   EventType = "domain_stopped"
	EventDomainPaused    EventType = "domain_paused"
	EventDomainResumed   EventType = "domain_resumed"
	EventDomainCrashed   EventType = "domain_crashed"
	EventConnectionLost  EventType = "connection_lost"
	EventConnectionRestored EventType = "connection_restored"
)

type Event struct {
	Type      EventType
	Domain    string
	Timestamp time.Time
	Details   map[string]interface{}
}

type EventListener func(*Event)

type EventBus struct {
	mutex     sync.RWMutex
	listeners map[string][]EventListener
	queue     chan *Event
	done      chan struct{}
	wg        sync.WaitGroup
}

func NewEventBus(bufferSize int) *EventBus {
	return &EventBus{
		listeners: make(map[string][]EventListener),
		queue:     make(chan *Event, bufferSize),
		done:      make(chan struct{}),
	}
}

func (eb *EventBus) Subscribe(eventType string, listener EventListener) {
	eb.mutex.Lock()
	defer eb.mutex.Unlock()

	if _, exists := eb.listeners[eventType]; !exists {
		eb.listeners[eventType] = make([]EventListener, 0)
	}

	eb.listeners[eventType] = append(eb.listeners[eventType], listener)
}

func (eb *EventBus) Unsubscribe(eventType string, listener EventListener) {
	eb.mutex.Lock()
	defer eb.mutex.Unlock()

	listeners, exists := eb.listeners[eventType]
	if !exists {
		return
	}

	// Simple removal - in production, use proper pointer comparison
	eb.listeners[eventType] = listeners
}

func (eb *EventBus) Publish(event *Event) error {
	select {
	case eb.queue <- event:
		return nil
	case <-eb.done:
		return fmt.Errorf("event bus is closed")
	default:
		return fmt.Errorf("event queue is full")
	}
}

func (eb *EventBus) Start(ctx context.Context) {
	eb.wg.Add(1)
	go func() {
		defer eb.wg.Done()

		for {
			select {
			case event := <-eb.queue:
				eb.dispatchEvent(event)
			case <-eb.done:
				return
			case <-ctx.Done():
				return
			}
		}
	}()
}

func (eb *EventBus) Stop() error {
	close(eb.done)
	eb.wg.Wait()
	return nil
}

func (eb *EventBus) dispatchEvent(event *Event) {
	eb.mutex.RLock()
	listeners, exists := eb.listeners[string(event.Type)]
	eb.mutex.RUnlock()

	if !exists {
		return
	}

	for _, listener := range listeners {
		go func(l EventListener, e *Event) {
			defer func() {
				if r := recover(); r != nil {
					fmt.Printf("Event listener panic: %v\n", r)
				}
			}()

			l(e)
		}(listener, event)
	}
}

type EventMonitor struct {
	eventBus      *EventBus
	domainManager *DomainManager
	pollInterval  time.Duration
	stateCache    map[string]DomainState
	mutex         sync.RWMutex
	done          chan struct{}
	wg            sync.WaitGroup
}

func NewEventMonitor(eventBus *EventBus, domainManager *DomainManager, pollInterval time.Duration) *EventMonitor {
	return &EventMonitor{
		eventBus:      eventBus,
		domainManager: domainManager,
		pollInterval:  pollInterval,
		stateCache:    make(map[string]DomainState),
		done:          make(chan struct{}),
	}
}

func (em *EventMonitor) Start(ctx context.Context) {
	em.wg.Add(1)
	go func() {
		defer em.wg.Done()

		ticker := time.NewTicker(em.pollInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				em.pollDomainStates(ctx)
			case <-em.done:
				return
			case <-ctx.Done():
				return
			}
		}
	}()
}

func (em *EventMonitor) Stop() error {
	close(em.done)
	em.wg.Wait()
	return nil
}

func (em *EventMonitor) pollDomainStates(ctx context.Context) {
	domains, err := em.domainManager.ListDomains(ctx)
	if err != nil {
		em.eventBus.Publish(&Event{
			Type:      EventConnectionLost,
			Timestamp: time.Now(),
			Details: map[string]interface{}{
				"error": err.Error(),
			},
		})
		return
	}

	em.mutex.Lock()
	defer em.mutex.Unlock()

	seenDomains := make(map[string]bool)

	for _, domain := range domains {
		seenDomains[domain.Name] = true
		oldState, exists := em.stateCache[domain.Name]

		if !exists || oldState != domain.State {
			em.stateCache[domain.Name] = domain.State

			eventType := em.stateToEventType(domain.State)
			em.eventBus.Publish(&Event{
				Type:      eventType,
				Domain:    domain.Name,
				Timestamp: time.Now(),
				Details: map[string]interface{}{
					"state":     domain.State,
					"cpu_time":  domain.CPUTime,
					"memory":    domain.UsedMem,
				},
			})
		}
	}

	for domain, state := range em.stateCache {
		if !seenDomains[domain] && state != DomainShutoff {
			delete(em.stateCache, domain)

			em.eventBus.Publish(&Event{
				Type:      EventDomainStopped,
				Domain:    domain,
				Timestamp: time.Now(),
				Details: map[string]interface{}{
					"state": DomainShutoff,
				},
			})
		}
	}
}

func (em *EventMonitor) stateToEventType(state DomainState) EventType {
	switch state {
	case DomainRunning:
		return EventDomainStarted
	case DomainPaused:
		return EventDomainPaused
	case DomainShutoff:
		return EventDomainStopped
	case DomainCrashed:
		return EventDomainCrashed
	default:
		return ""
	}
}

func (em *EventMonitor) GetCachedState(domain string) (DomainState, bool) {
	em.mutex.RLock()
	defer em.mutex.RUnlock()

	state, exists := em.stateCache[domain]
	return state, exists
}
