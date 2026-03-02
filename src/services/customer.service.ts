import { toast } from 'react-hot-toast';

const baseUrl =  import.meta.env.VITE_API_BASE_URL
const API_URL = `${baseUrl}/support-requests`;


export async function submitSupportRequest(
  payload: any,
  token: string,
  setMessage: (msg: string) => void,
  setRequestType: (type: string) => void
): Promise<void> {
  try {
    const response = await fetch(API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token || "",
        },
        body: JSON.stringify(payload),
      }
    );
    const data = await response.json();
    if (response.ok) {
      toast.success("Request submitted successfully!");
      setMessage("");
      setRequestType("MISSED_DELIVERY");
    } else {
      console.error("Submission error:", data);
      toast.error(data.error || "Failed to submit request.");
    }
  } catch (error) {
    console.error("Error:", error);
    toast.error("Something went wrong while submitting the request.");
  }
}
 // useEffect(() => {
  //   const fetchOrders = async () => {
  //     try {
  //       const response = await fetch(
  //         `http://localhost:8000/api/v1/orders?customerId=${customerId}`,
  //         {
  //           headers: {
  //             Authorization: token || "",
  //           },
  //         }
  //       );
  //       const data = await response.json();
  //       if (response.ok) {
  //         setOrders(data.orders || []); // adjust this according to your API response
  //       } else {
  //         console.error("Failed to fetch orders:", data.error);
  //       }
  //     } catch (error) {
  //       console.error("Error fetching orders:", error);
  //     }
  //   };
  //   if (customerId) fetchOrders();
  // }, [customerId]);