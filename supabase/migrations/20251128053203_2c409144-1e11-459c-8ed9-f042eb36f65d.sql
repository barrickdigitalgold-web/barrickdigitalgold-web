-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_related_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, related_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_related_id);
END;
$$;

-- Trigger function for transaction status changes
CREATE OR REPLACE FUNCTION public.notify_transaction_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Transaction Status Updated',
      'Your top-up transaction of ' || NEW.amount::text || ' has been ' || NEW.status || '.',
      'transaction',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for transaction status changes
DROP TRIGGER IF EXISTS trigger_transaction_status_change ON public.transactions;
CREATE TRIGGER trigger_transaction_status_change
AFTER UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.notify_transaction_status_change();

-- Trigger function for gold purchases
CREATE OR REPLACE FUNCTION public.notify_gold_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.user_id,
    'Gold Purchase Successful',
    'You have successfully purchased ' || NEW.gold_amount_grams::text || 'g of gold for ' || NEW.total_cost::text || '.',
    'gold_purchase',
    NEW.id
  );
  RETURN NEW;
END;
$$;

-- Trigger for gold purchases
DROP TRIGGER IF EXISTS trigger_gold_purchase ON public.gold_purchases;
CREATE TRIGGER trigger_gold_purchase
AFTER INSERT ON public.gold_purchases
FOR EACH ROW
EXECUTE FUNCTION public.notify_gold_purchase();

-- Trigger function for gold sales
CREATE OR REPLACE FUNCTION public.notify_gold_sale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.user_id,
    'Gold Sale Successful',
    'You have successfully sold ' || NEW.gold_amount_grams::text || 'g of gold for ' || NEW.total_amount::text || '. Profit: ' || NEW.profit_amount::text || '.',
    'gold_sale',
    NEW.id
  );
  RETURN NEW;
END;
$$;

-- Trigger for gold sales
DROP TRIGGER IF EXISTS trigger_gold_sale ON public.gold_sales;
CREATE TRIGGER trigger_gold_sale
AFTER INSERT ON public.gold_sales
FOR EACH ROW
EXECUTE FUNCTION public.notify_gold_sale();

-- Trigger function for investment purchases
CREATE OR REPLACE FUNCTION public.notify_investment_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.create_notification(
    NEW.user_id,
    'Investment Plan Activated',
    'Your investment of ' || NEW.amount_invested::text || ' has been activated successfully.',
    'investment',
    NEW.id
  );
  RETURN NEW;
END;
$$;

-- Trigger for investment purchases
DROP TRIGGER IF EXISTS trigger_investment_purchase ON public.user_investments;
CREATE TRIGGER trigger_investment_purchase
AFTER INSERT ON public.user_investments
FOR EACH ROW
EXECUTE FUNCTION public.notify_investment_purchase();

-- Trigger function for withdrawal status changes
CREATE OR REPLACE FUNCTION public.notify_withdrawal_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status != OLD.status THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'Withdrawal Request ' || INITCAP(NEW.status),
      'Your withdrawal request of ' || NEW.amount::text || ' has been ' || NEW.status || COALESCE('. Message: ' || NEW.admin_message, '.'),
      'withdrawal',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for withdrawal status changes
DROP TRIGGER IF EXISTS trigger_withdrawal_status_change ON public.withdrawal_requests;
CREATE TRIGGER trigger_withdrawal_status_change
AFTER UPDATE ON public.withdrawal_requests
FOR EACH ROW
EXECUTE FUNCTION public.notify_withdrawal_status_change();

-- Trigger function for chat messages from staff/admin
CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the user_id from the conversation
  SELECT user_id INTO v_user_id
  FROM public.chat_conversations
  WHERE id = NEW.conversation_id;

  -- Only notify if message is not from the user
  IF NEW.sender_id != v_user_id THEN
    PERFORM public.create_notification(
      v_user_id,
      'New Chat Message',
      'You have received a new message in chat support.',
      'chat',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for chat messages
DROP TRIGGER IF EXISTS trigger_chat_message ON public.chat_messages;
CREATE TRIGGER trigger_chat_message
AFTER INSERT ON public.chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_chat_message();