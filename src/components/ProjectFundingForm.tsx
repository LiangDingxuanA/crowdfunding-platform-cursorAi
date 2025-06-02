import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  PaymentElement,
  useStripe,
  useElements,
  Elements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
  throw new Error('Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);

interface ProjectFundingFormProps {
  projectId: string;
  projectTitle: string;
  minAmount?: number;
  maxAmount?: number;
  onSuccess?: () => void;
}

function PaymentForm({
  projectId,
  projectTitle,
  minAmount = 1,
  maxAmount = 100000,
  onSuccess,
}: ProjectFundingFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { data: session } = useSession();
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    if (amount && parseFloat(amount) >= minAmount) {
      // Create PaymentIntent when amount changes
      const createIntent = async () => {
        try {
          const response = await fetch(`/api/projects/${projectId}/fund`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              amount: parseFloat(amount),
            }),
          });

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Failed to create payment intent');
          }

          setClientSecret(data.clientSecret);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      };

      createIntent();
    }
  }, [amount, projectId, minAmount]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/projects/${projectId}/funded`,
        },
      });

      if (submitError) {
        throw submitError;
      }

      // Payment successful
      onSuccess?.();
    } catch (err) {
      console.error('Payment error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to process payment'
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setAmount(value);
    }
  };

  if (!session) {
    return (
      <div className="text-center p-4">
        Please sign in to fund this project.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-gray-700"
        >
          Funding Amount (USD)
        </label>
        <div className="mt-1">
          <input
            type="text"
            id="amount"
            value={amount}
            onChange={handleAmountChange}
            placeholder="Enter amount"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            required
            min={minAmount}
            max={maxAmount}
          />
        </div>
      </div>

      {clientSecret && (
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      )}

      {error && (
        <div className="text-red-600 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={!stripe || !elements || processing || !amount}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {processing ? 'Processing...' : `Fund ${projectTitle}`}
      </button>
    </form>
  );
}

export default function ProjectFundingForm(props: ProjectFundingFormProps) {
  return (
    <Elements stripe={stripePromise}>
      <PaymentForm {...props} />
    </Elements>
  );
} 