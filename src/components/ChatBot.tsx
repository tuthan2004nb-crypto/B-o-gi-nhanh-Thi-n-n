import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Mic, X, Bot, User, Loader2, MicOff, Minus, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

interface ChatBotProps {
  modules: any[];
  setModules: (modules: any) => void;
  project: any;
  setProject: (project: any) => void;
  catalog: any[];
  onExport?: () => void;
  onProductClick?: (product: any) => void;
}

interface ProductSuggestion {
  id?: string;
  moduleId: string;
  brand: string;
  name: string;
  code?: string;
  description?: string;
  shape?: string;
  color?: string;
  glassType?: string;
  borderType?: string;
  unit: string;
  price: number;
  qty: number;
  image?: string;
  isSelectingQty?: boolean;
  selectedQty?: number;
}

interface Message {
  role: 'user' | 'bot';
  text: string;
  suggestions?: ProductSuggestion[];
  sources?: { uri: string; title: string }[];
  quickActions?: any[];
}

export default function ChatBot({ modules, setModules, project, setProject, catalog, onExport, onProductClick }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSessionPrompt, setShowSessionPrompt] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const initialBotMessage: Message = { 
    role: 'bot', 
    text: 'Xin chào! Tôi là trợ lý AI cao cấp của Thiên Ân. Tôi có thể giúp bạn tư vấn giải pháp, tra cứu thông tin công nghệ mới nhất và hoàn thiện báo giá. Bạn cần tôi hỗ trợ gì hôm nay?',
    quickActions: [
      'Smart Home',
      'Smart lighting',
      'Camera',
      'Mạng',
      'Rèm tự động',
      'Khóa thông minh',
      'Điện mặt trời',
      'Cổng tự động'
    ]
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('chat_messages');
    return saved ? JSON.parse(saved) : [initialBotMessage];
  });

  useEffect(() => {
    localStorage.setItem('chat_messages', JSON.stringify(messages));
  }, [messages]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<{label: string, category: string, baseQuery: string}[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const productCatalog = catalog;

  const handleAddProduct = (product: ProductSuggestion, finalQty: number) => {
    setModules((prev: any[]) => prev.map(mod => {
      if (mod.id === product.moduleId) {
        const existingItemIndex = mod.items.findIndex((item: any) => 
          item.name === product.name && item.brand === product.brand
        );

        let newItems;
        if (existingItemIndex > -1) {
          newItems = [...mod.items];
          newItems[existingItemIndex] = {
            ...newItems[existingItemIndex],
            qty: newItems[existingItemIndex].qty + finalQty
          };
        } else {
          newItems = [
            ...mod.items,
            {
              id: Math.random().toString(36).substr(2, 9),
              brand: product.brand,
              name: product.name,
              code: product.code || '',
              description: product.description || '',
              shape: product.shape || '',
              color: product.color || '',
              glassType: product.glassType || '',
              borderType: product.borderType || '',
              unit: product.unit,
              qty: finalQty,
              price: product.price,
              discount: 0,
              note: '',
              image: product.image
            }
          ];
        }

        return {
          ...mod,
          enabled: true,
          items: newItems
        };
      }
      return mod;
    }));
    setMessages(prev => [...prev, { role: 'bot', text: `Đã cập nhật ${product.name} (SL: ${finalQty}) vào báo giá.` }]);
  };

  const handleStartSelectQty = (msgIdx: number, suggestionIdx: number) => {
    setMessages(prev => {
      const newMessages = [...prev];
      const suggestions = newMessages[msgIdx].suggestions;
      if (suggestions) {
        suggestions[suggestionIdx] = { 
          ...suggestions[suggestionIdx], 
          isSelectingQty: true,
          selectedQty: suggestions[suggestionIdx].qty || 1
        };
      }
      return newMessages;
    });
  };

  const handleUpdateQty = (msgIdx: number, suggestionIdx: number, newQty: number) => {
    if (newQty < 1) return;
    setMessages(prev => {
      const newMessages = [...prev];
      const suggestions = newMessages[msgIdx].suggestions;
      if (suggestions) {
        suggestions[suggestionIdx] = { 
          ...suggestions[suggestionIdx], 
          selectedQty: newQty
        };
      }
      return newMessages;
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, showSessionPrompt]);

  // Draggable logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y
      };
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && window.innerWidth >= 768) {
        const newX = Math.min(Math.max(e.clientX - dragOffset.current.x, -window.innerWidth + 400), 0);
        const newY = Math.min(Math.max(e.clientY - dragOffset.current.y, -window.innerHeight + 500), 0);
        setPosition({ x: newX, y: newY });
      }
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const toggleChat = () => {
    if (!isOpen) {
      if (messages.length > 1) {
        setShowSessionPrompt(true);
      }
      setIsOpen(true);
      setIsMinimized(false);
    } else {
      setIsOpen(false);
    }
  };

  const startNewSession = () => {
    setMessages([initialBotMessage]);
    setShowSessionPrompt(false);
    localStorage.removeItem('chat_messages');
  };

  const clearChat = () => {
    setConfirmDialog({
      message: 'Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện?',
      onConfirm: () => {
        setMessages([initialBotMessage]);
        localStorage.removeItem('chat_messages');
        setConfirmDialog(null);
      }
    });
  };

  const continueSession = () => {
    setShowSessionPrompt(false);
  };

  const searchProductTool: FunctionDeclaration = {
    name: "searchProduct",
    description: "Tìm kiếm thiết bị/sản phẩm trong cơ sở dữ liệu để tư vấn cho khách hàng. Có thể tìm theo tên, mã sản phẩm, thương hiệu, mô tả, hình dạng, màu sắc, loại viền, loại kính.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: "Từ khóa tìm kiếm (ví dụ: 'camera', 'công tắc đen viền nhôm', 'đèn vuông'). Để trống nếu muốn lấy tất cả sản phẩm của hạng mục." },
        moduleId: { type: Type.STRING, description: "ID của hạng mục (smarthome, security, solar, lighting, network, curtain, lock, gate). Để trống nếu tìm tất cả." }
      }
    }
  };

  const updateQuoteTool: FunctionDeclaration = {
    name: "updateQuote",
    description: "Cập nhật báo giá bằng cách thêm thiết bị vào các hạng mục hoặc cập nhật thông tin dự án.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        items: {
          type: Type.ARRAY,
          description: "Danh sách các thiết bị cần thêm vào báo giá",
          items: {
            type: Type.OBJECT,
            properties: {
              moduleId: { type: Type.STRING, description: "ID của hạng mục (smarthome, security, solar, lighting, network, curtain, lock, gate)" },
              brand: { type: Type.STRING, description: "Thương hiệu thiết bị" },
              name: { type: Type.STRING, description: "Tên thiết bị" },
              code: { type: Type.STRING, description: "Mã sản phẩm" },
              description: { type: Type.STRING, description: "Mô tả sản phẩm" },
              shape: { type: Type.STRING, description: "Hình dạng (Vuông, Chữ nhật...)" },
              color: { type: Type.STRING, description: "Màu sắc (Đen, Trắng...)" },
              glassType: { type: Type.STRING, description: "Loại kính (Lõm, Phẳng...)" },
              borderType: { type: Type.STRING, description: "Loại viền (Nhôm, Kính...)" },
              unit: { type: Type.STRING, description: "Đơn vị tính (Cái, Bộ, Tấm...)" },
              qty: { type: Type.NUMBER, description: "Số lượng" },
              price: { type: Type.NUMBER, description: "Đơn giá" },
              discount: { type: Type.NUMBER, description: "Phần trăm chiết khấu (mặc định 0)" },
              image: { type: Type.STRING, description: "URL hình ảnh sản phẩm" }
            },
            required: ["moduleId", "name", "qty", "price"]
          }
        },
        projectInfo: {
          type: Type.OBJECT,
          description: "Thông tin dự án cần cập nhật",
          properties: {
            name: { type: Type.STRING, description: "Tên dự án" },
            customer: { type: Type.STRING, description: "Tên khách hàng" },
            phone: { type: Type.STRING, description: "Số điện thoại khách hàng" },
            address: { type: Type.STRING, description: "Địa chỉ công trình" }
          }
        }
      }
    }
  };

  const triggerExportTool: FunctionDeclaration = {
    name: "triggerExport",
    description: "Kích hoạt tính năng xuất báo giá sang file PDF cho khách hàng.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        confirm: { type: Type.BOOLEAN, description: "Xác nhận xuất file" }
      }
    }
  };

  const handleSendMessage = async (text?: string, audioData?: string) => {
    const userText = text || (audioData ? "🎤 [Tin nhắn thoại]" : "");
    if (!userText && !audioData) return;

    // Add to UI immediately
    const newUserMessage: Message = { role: 'user', text: userText };
    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        setMessages(prev => [...prev, { role: 'bot', text: "Lỗi: Hệ thống chưa được cấu hình API Key. Vui lòng kiểm tra lại phần Secrets trong Settings." }]);
        setIsLoading(false);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3-flash-preview";
      
      // 1. Build clean alternating history (excluding the message we just added)
      const history = messages.slice(-10);
      const contents: any[] = [];
      let lastRole = '';
      
      history.forEach(m => {
        const role = m.role === 'bot' ? 'model' : 'user';
        const text = m.text?.trim() || "...";
        
        if (role === lastRole && contents.length > 0) {
          contents[contents.length - 1].parts[0].text += "\n" + text;
        } else {
          contents.push({ role, parts: [{ text }] });
          lastRole = role;
        }
      });
      
      // 2. Ensure history starts with user
      while (contents.length > 0 && contents[0].role !== 'user') {
        contents.shift();
      }

      // 3. Add current message parts as a new turn
      const currentParts: any[] = [];
      if (text) {
        currentParts.push({ text });
      }
      if (audioData) {
        currentParts.push({ inlineData: { mimeType: "audio/webm", data: audioData } });
      }
      if (currentParts.length === 0 && !text && !audioData) {
        currentParts.push({ text: "Hãy phân tích yêu cầu của tôi." });
      }

      if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
        // Merge with last user turn if history ended with user
        currentParts.forEach(part => {
          if (part.text) {
            contents[contents.length - 1].parts[0].text += "\n" + part.text;
          } else {
            contents[contents.length - 1].parts.push(part);
          }
        });
      } else if (currentParts.length > 0) {
        contents.push({ role: "user", parts: currentParts });
      }

      // 4. Final check: ensure we have at least one user turn
      if (contents.length === 0) {
        contents.push({ role: 'user', parts: [{ text: userText || "Xin chào" }] });
      }

      let response;
      let retries = 3;
      let currentModel = "gemini-3-flash-preview";
      
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: currentModel,
            contents,
            config: {
              systemInstruction: `Bạn là chuyên gia tư vấn AI của Thiên Ân Smarthome.
              Nhiệm vụ của bạn:
              1. Tư vấn giải pháp chi tiết cho từng hạng mục: Nhà thông minh (smarthome), Chiếu sáng thông minh (lighting), An ninh/Camera (security), Điện mặt trời (solar), Mạng (network), Rèm tự động (curtain), Khóa thông minh (lock), Cổng tự động (gate).
              2. KHI TƯ VẤN GIẢI PHÁP HOẶC KHI KHÁCH HỎI VỀ SẢN PHẨM: Bạn PHẢI LUÔN gọi công cụ searchProduct để tìm các sản phẩm thực tế có trong cơ sở dữ liệu. 
                 - Sau khi có kết quả từ cơ sở dữ liệu, hãy đưa ra các MẸO (tips) hữu ích về cách lựa chọn, sử dụng hoặc kết hợp các sản phẩm đó để tối ưu hóa trải nghiệm cho khách hàng.
                 - Nếu khách hỏi chung về 1 hạng mục (VD: "tư vấn nhà thông minh"), hãy gọi searchProduct với moduleId tương ứng (VD: "smarthome") và query rỗng để lấy sản phẩm tiêu biểu.
                 - Nếu khách hỏi chi tiết (VD: "công tắc màu đen"), hãy gọi searchProduct với query tương ứng.
              3. Sử dụng công cụ updateQuote để thêm sản phẩm vào báo giá khi khách yêu cầu.
              4. Sử dụng triggerExport để xuất file PDF báo giá.
              Luôn trả lời chuyên nghiệp, nhiệt tình và ngắn gọn, tập trung vào lợi ích của giải pháp và mẹo sử dụng sản phẩm.`,
              tools: [
                { functionDeclarations: [searchProductTool, updateQuoteTool, triggerExportTool] }
              ]
            }
          });
          break;
        } catch (error: any) {
          if (error.message?.includes("503") || error.message?.includes("UNAVAILABLE")) {
            retries--;
            if (retries === 0) throw error;
            console.log(`Model ${currentModel} is busy. Retrying with gemini-3.1-flash-lite-preview...`);
            currentModel = "gemini-3.1-flash-lite-preview";
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            throw error;
          }
        }
      }

      if (!response) {
        throw new Error("Failed to get response from AI after multiple retries.");
      }

      const functionCalls = response.functionCalls;
      if (functionCalls) {
        let suggestedProducts: ProductSuggestion[] = [];
        let exportTriggered = false;
        let searchPerformed = false;
        let generatedQuickActions: any[] | undefined = undefined;

        for (const call of functionCalls) {
          if (call.name === "searchProduct") {
            searchPerformed = true;
            const args = call.args as any;
            const normalizeSearchText = (text: string) => {
              if (!text) return '';
              return text.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/đ/g, "d")
                .replace(/[\s\-\/]/g, '');
            };

            const query = (args.query || '').toLowerCase();
            const moduleId = args.moduleId;
            
            const searchParts = query.split(/\s+/).filter(Boolean).map(normalizeSearchText);
            
            const allResults = productCatalog.filter(p => {
              const matchesModule = !moduleId || p.moduleId === moduleId;
              if (!matchesModule) return false;
              
              if (searchParts.length === 0) return true;
              
              const allFieldsText = [
                p.name,
                p.brand,
                p.code,
                p.description,
                p.desc,
                p.shape,
                p.color,
                p.glassType,
                p.borderType
              ].map(normalizeSearchText).join(' ');

              return searchParts.every(part => allFieldsText.includes(part));
            });
            
            const results = allResults.slice(0, 5); // Limit to top 5 results

            if (results.length > 0) {
              if (allResults.length > 1) {
                const shapes = new Set<string>();
                const colors = new Set<string>();
                const glassTypes = new Set<string>();
                const borderTypes = new Set<string>();
                const buttonCounts = new Set<string>();

                allResults.forEach(p => {
                  if (p.shape) shapes.add(p.shape);
                  if (p.color) colors.add(p.color);
                  if (p.glassType) glassTypes.add(p.glassType);
                  if (p.borderType) borderTypes.add(p.borderType);
                  
                  if (p.name.toLowerCase().includes('công tắc')) {
                    const match = p.name.match(/(\d+)\s*nút/i);
                    if (match) buttonCounts.add(`${match[1]} nút`);
                  }
                });

                const filters: any[] = [];
                const addFilter = (label: string, category: string) => {
                  if (!query.toLowerCase().includes(label.toLowerCase())) {
                    filters.push({ label, category, baseQuery: query, isFilter: true });
                  }
                };

                buttonCounts.forEach(l => addFilter(l, 'button'));
                shapes.forEach(l => addFilter(l, 'shape'));
                colors.forEach(l => addFilter(l, 'color'));
                glassTypes.forEach(l => addFilter(l, 'glass'));
                borderTypes.forEach(l => addFilter(l, 'border'));

                if (filters.length > 0) {
                  generatedQuickActions = filters.slice(0, 8);
                }
              }

              results.forEach(item => {
                suggestedProducts.push({
                  id: item.id,
                  moduleId: item.moduleId,
                  brand: item.brand,
                  name: item.name,
                  code: item.code,
                  description: item.description,
                  shape: item.shape,
                  color: item.color,
                  glassType: item.glassType,
                  borderType: item.borderType,
                  unit: item.unit,
                  price: item.price,
                  qty: 1,
                  image: item.image || 'https://picsum.photos/seed/product/200/200'
                });
              });
            }
          } else if (call.name === "updateQuote") {
            const args = call.args as any;
            if (args.projectInfo) {
              setProject((prev: any) => ({ ...prev, ...args.projectInfo }));
            }
            if (args.items) {
              args.items.forEach((item: any) => {
                const catalogItem = productCatalog.find(p => p.name === item.name);
                suggestedProducts.push({
                  ...(catalogItem || {}),
                  ...item,
                  image: catalogItem?.image || 'https://picsum.photos/seed/product/200/200'
                });
              });
            }
          } else if (call.name === "triggerExport") {
            exportTriggered = true;
          }
        }
        
        if (exportTriggered) {
          if (onExport) onExport();
          setMessages(prev => [...prev, { role: 'bot', text: "Tôi đã chuẩn bị xong bản báo giá PDF cho bạn. Quá trình tải xuống sẽ bắt đầu ngay bây giờ!" }]);
        } else if (searchPerformed) {
          if (suggestedProducts.length > 0) {
            setMessages(prev => [...prev, { 
              role: 'bot', 
              text: "Tôi đã tìm thấy các sản phẩm sau trong cơ sở dữ liệu. Bạn có muốn thêm chúng vào báo giá không?",
              suggestions: suggestedProducts,
              quickActions: generatedQuickActions
            }]);
          } else {
            setMessages(prev => [...prev, { role: 'bot', text: "Rất tiếc, tôi không tìm thấy sản phẩm nào phù hợp với yêu cầu của bạn trong cơ sở dữ liệu." }]);
          }
        } else if (suggestedProducts.length > 0) {
          setMessages(prev => [...prev, { 
            role: 'bot', 
            text: "Dựa trên yêu cầu của bạn, tôi đã tìm thấy các thiết bị phù hợp trong danh mục của Thiên Ân. Bạn có muốn thêm chúng vào báo giá không?",
            suggestions: suggestedProducts
          }]);
        } else {
          setMessages(prev => [...prev, { role: 'bot', text: "Tôi đã cập nhật thông tin dự án theo yêu cầu của bạn." }]);
        }
      } else {
        // Extract grounding sources if any
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
          uri: chunk.web?.uri,
          title: chunk.web?.title
        })).filter((s: any) => s.uri && s.title);

        setMessages(prev => [...prev, { 
          role: 'bot', 
          text: response.text || "Tôi có thể giúp gì thêm cho bạn không?",
          sources: sources
        }]);
      }
    } catch (error: any) {
      console.error("Gemini Error:", error);
      let errorMessage = "Rất tiếc, hệ thống AI đang bận hoặc gặp sự cố kết nối. Vui lòng thử lại sau giây lát.";
      
      if (error.message?.includes("400") || error.message?.includes("INVALID_ARGUMENT")) {
        errorMessage = "Có lỗi cấu hình AI (400). Tôi đang tự động điều chỉnh lại hệ thống. Vui lòng thử lại.";
      } else if (error.message?.includes("403") || error.message?.includes("PERMISSION_DENIED")) {
        errorMessage = "Lỗi xác thực API Key (403). Vui lòng kiểm tra lại cấu hình hệ thống.";
      }

      setMessages(prev => [...prev, { role: 'bot', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterClick = (label: string, category: string, baseQuery: string) => {
    setSelectedFilters(prev => {
      let newFilters = [...prev];
      const existingIdx = newFilters.findIndex(f => f.label === label);
      
      if (existingIdx >= 0) {
        newFilters.splice(existingIdx, 1);
      } else {
        newFilters = newFilters.filter(f => f.category !== category);
        newFilters.push({ label, category, baseQuery });
      }
      
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }

      if (newFilters.length > 0) {
        filterTimeoutRef.current = setTimeout(() => {
          const combinedQuery = `${baseQuery} ${newFilters.map(f => f.label).join(' ')}`.trim();
          handleSendMessage(`Tìm ${combinedQuery}`);
          setSelectedFilters([]); // reset after sending
        }, 3000);
      }
      
      return newFilters;
    });
  };

  const startRecording = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    if (isRecording || isLoading) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64Audio = (reader.result as string).split(',')[1];
            handleSendMessage(undefined, base64Audio);
          };
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Không thể truy cập micro. Vui lòng cấp quyền truy cập.");
    }
  };

  const stopRecording = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) e.preventDefault();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  return (
    <div 
      className="fixed bottom-20 right-4 md:bottom-24 md:right-6 z-[60] no-print"
      style={{ 
        transform: window.innerWidth >= 768 ? `translate(${position.x}px, ${position.y}px)` : 'none',
        transition: isDragging ? 'none' : 'transform 0.1s ease-out'
      }}
      onMouseDown={handleMouseDown}
    >
      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-[calc(100vw-2rem)] md:w-[400px] max-w-[400px] h-[70vh] md:h-[500px] flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-[#0F4C81] p-4 text-white flex justify-between items-center drag-handle md:cursor-move select-none">
              <div className="flex items-center gap-2">
                <Bot size={20} />
                <span className="font-bold">Trợ lý Thiên Ân</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); clearChat(); }} 
                  className="hover:bg-white/20 p-1 rounded-full transition-colors"
                  title="Xóa lịch sử"
                >
                  <RotateCcw size={18} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsMinimized(true); }} 
                  className="hover:bg-white/20 p-1 rounded-full transition-colors"
                  title="Thu nhỏ"
                >
                  <Minus size={20} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} 
                  className="hover:bg-white/20 p-1 rounded-full transition-colors"
                  title="Đóng"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 relative">
              {showSessionPrompt ? (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center">
                  <RotateCcw size={48} className="text-[#0F4C81] mb-4 animate-spin-slow" />
                  <h3 className="font-bold text-gray-800 mb-2">Tiếp tục phiên làm việc?</h3>
                  <p className="text-sm text-gray-600 mb-6">Bạn có muốn tiếp tục cuộc trò chuyện trước đó hay bắt đầu một phiên mới?</p>
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={startNewSession}
                      className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-semibold transition-colors"
                    >
                      Mới
                    </button>
                    <button 
                      onClick={continueSession}
                      className="flex-1 py-2 px-4 bg-[#0F4C81] hover:bg-[#0F4C81]/90 text-white rounded-xl font-semibold transition-colors"
                    >
                      Tiếp tục
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user' 
                        ? 'bg-[#1BA1E2] text-white rounded-tr-none' 
                        : 'bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-none'
                      }`}>
                        {msg.text}
                        
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-gray-100">
                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Nguồn tham khảo:</p>
                            <div className="flex flex-wrap gap-2">
                              {msg.sources.map((source, sIdx) => (
                                <a 
                                  key={sIdx} 
                                  href={source.uri} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[10px] bg-gray-50 text-[#0F4C81] px-2 py-1 rounded border border-gray-100 hover:bg-gray-100 transition-colors truncate max-w-[150px]"
                                  title={source.title}
                                >
                                  {source.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {msg.quickActions && (
                        <div className="mt-3 flex flex-wrap gap-2 max-w-[90%]">
                          {msg.quickActions.map((action, aIdx) => {
                            const isObj = typeof action === 'object';
                            const isFilter = isObj && action.isFilter;
                            const label = isObj ? action.label : action;
                            const query = isObj ? action.action : `Tư vấn thiết bị ${action}`;
                            
                            if (isFilter) {
                              const isSelected = selectedFilters.some(f => f.label === label);
                              return (
                                <button
                                  key={aIdx}
                                  onClick={() => handleFilterClick(label, action.category, action.baseQuery)}
                                  className={`border px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm ${
                                    isSelected 
                                      ? 'bg-[#0F4C81] text-white border-[#0F4C81]' 
                                      : 'bg-white border-[#0F4C81]/30 text-[#0F4C81] hover:bg-[#0F4C81]/10'
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            }

                            return (
                              <button
                                key={aIdx}
                                onClick={() => handleSendMessage(query)}
                                className="bg-white border border-[#0F4C81]/30 text-[#0F4C81] hover:bg-[#0F4C81] hover:text-white px-3 py-1.5 rounded-full text-xs font-medium transition-colors shadow-sm"
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {msg.suggestions && (
                        <div className="mt-2 space-y-2 w-full max-w-[90%]">
                          {msg.suggestions.map((prod, pIdx) => (
                            <div key={pIdx} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                              <img 
                                src={prod.image} 
                                alt={prod.name} 
                                className="w-full h-32 object-contain bg-transparent mix-blend-multiply cursor-pointer hover:opacity-80 transition-opacity"
                                referrerPolicy="no-referrer"
                                onClick={() => onProductClick && onProductClick(prod)}
                              />
                              <div className="p-3">
                                <h4 
                                  className="font-bold text-gray-800 text-sm line-clamp-1 cursor-pointer hover:text-[#1BA1E2] transition-colors"
                                  onClick={() => onProductClick && onProductClick(prod)}
                                >
                                  {prod.name}
                                </h4>
                                <p className="text-xs text-gray-500 mb-2">{prod.brand}</p>
                                <div className="flex justify-between items-center">
                                  <span className="text-[#0F4C81] font-bold text-sm">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(prod.price)}
                                  </span>
                                  
                                  {!prod.isSelectingQty ? (
                                    <button 
                                      onClick={() => handleAddProduct(prod, 1)}
                                      className="bg-[#1BA1E2] text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-[#1BA1E2]/90 transition-colors"
                                    >
                                      Thêm
                                    </button>
                                  ) : (
                                    <div className="flex flex-col gap-2 items-end">
                                      <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                                        <button 
                                          onClick={() => handleUpdateQty(idx, pIdx, (prod.selectedQty || 1) - 1)}
                                          className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:bg-gray-50"
                                        >
                                          -
                                        </button>
                                        <span className="text-xs font-bold w-6 text-center">{prod.selectedQty || 1}</span>
                                        <button 
                                          onClick={() => handleUpdateQty(idx, pIdx, (prod.selectedQty || 1) + 1)}
                                          className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-gray-600 hover:bg-gray-50"
                                        >
                                          +
                                        </button>
                                      </div>
                                      <button 
                                        onClick={() => handleAddProduct(prod, prod.selectedQty || 1)}
                                        className="bg-[#0F4C81] text-white px-4 py-1 rounded-lg text-xs font-bold hover:opacity-90 transition-colors"
                                      >
                                        Xác nhận
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start items-center gap-2">
                      <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 rounded-tl-none flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin text-[#0F4C81]" />
                        <span className="text-[10px] text-gray-400 font-medium animate-pulse">Trợ lý đang suy nghĩ...</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-white">
              <div className="flex items-center gap-2">
                <button 
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={isLoading}
                  className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  title="Giữ để nói"
                >
                  {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <input 
                  type="text" 
                  placeholder="Nhập yêu cầu của bạn..."
                  className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-[#1BA1E2] outline-none"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(input)}
                  disabled={showSessionPrompt || isLoading}
                />
                <button 
                  onClick={() => handleSendMessage(input)}
                  disabled={!input.trim() || isLoading || showSessionPrompt}
                  className="bg-[#0F4C81] text-white p-2 rounded-full hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
              {isRecording && <p className="text-[10px] text-red-500 text-center mt-1 font-bold animate-pulse">Đang ghi âm... Thả ra để gửi</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={toggleChat}
        className={`bg-[#0F4C81] text-white p-4 rounded-full shadow-xl hover:scale-110 transition-all active:scale-95 flex items-center justify-center relative ${isMinimized && isOpen ? 'ring-4 ring-[#1BA1E2] ring-offset-2' : ''}`}
      >
        <MessageSquare size={28} />
        {isMinimized && isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></span>
        )}
      </button>
      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-xs w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Xác nhận</h3>
            <p className="text-sm text-gray-600 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Hủy
              </button>
              <button 
                onClick={confirmDialog.onConfirm}
                className="px-4 py-2 text-xs bg-[#0F4C81] text-white rounded-lg font-medium hover:opacity-90 transition-colors"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
