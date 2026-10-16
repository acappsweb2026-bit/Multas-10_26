import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  Upload,
  User,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  SwitchCamera,
  Image as ImageIcon,
  Zap,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { Driver } from '../types';
import { extractCnhData } from '../services/apiService';
import { formatCPF } from '../lib/formatters';
import { normalizeScannedDriverData } from '../lib/documentParser';

interface CNHScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (scannedData: Partial<Driver>) => void;
}

export const CNHScannerModal: React.FC<CNHScannerModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [scanResult, setScanResult] = useState<Partial<Driver> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Check for available video input devices
  const checkCameras = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      }
    } catch {
      // Ignore device enumeration errors
    }
  }, []);

  // Stop camera media tracks cleanly
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start live camera stream
  const startCameraStream = useCallback(async (mode: 'environment' | 'user' = facingMode) => {
    stopCameraStream();
    setCameraError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Seu navegador não suporta acesso direto à câmera. Use a opção de envio de foto do celular.');
      setActiveTab('upload');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setIsCameraActive(true);
      setFacingMode(mode);
    } catch (err: any) {
      console.warn('Erro ao inicializar câmera:', err);
      let msg = 'Não foi possível acessar a câmera do dispositivo.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Permissão para uso da câmera foi negada. Permita o acesso nas configurações do navegador ou use o botão "Tirar Foto".';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Nenhuma câmera encontrada neste dispositivo. Use a opção de envio de foto ou arquivo.';
      }
      setCameraError(msg);
      setIsCameraActive(false);
    }
  }, [facingMode, stopCameraStream]);

  // Lifecycle when modal opens/closes or tab changes
  useEffect(() => {
    if (isOpen) {
      checkCameras();
      setScanResult(null);
      setErrorMessage('');
      setCapturedPreview(null);
      setIsProcessing(false);

      if (activeTab === 'camera') {
        startCameraStream(facingMode);
      }
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, activeTab, checkCameras, startCameraStream, stopCameraStream, facingMode]);

  // Toggle front / back camera on smartphones
  const handleToggleCamera = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    startCameraStream(nextMode);
  };

  // Process image data (base64) through the AI / OCR extraction endpoint
  const processDocumentPayload = async (
    base64Data: string,
    mimeType: string = 'image/jpeg',
    fileName?: string
  ) => {
    setIsProcessing(true);
    setErrorMessage('');
    setScanResult(null);

    setProcessingStep('Preparando imagem do documento...');
    await new Promise((r) => setTimeout(r, 200));

    setProcessingStep('Lendo texto e campos da CNH via Inteligência Artificial...');

    try {
      const response = await extractCnhData({
        base64Data,
        mimeType,
        fileName: fileName || 'cnh-digital-scan.jpg',
      });

      if (response.success && response.data) {
        setProcessingStep('CNH identificada com sucesso! Organizando dados...');
        const normalized = normalizeScannedDriverData(response.data);
        setScanResult(normalized);
      } else {
        setErrorMessage(
          response.error ||
            'Não foi possível reconhecer os dados da CNH com nitidez suficiente. Certifique-se de que a foto está nítida, com boa iluminação e sem reflexos.'
        );
      }
    } catch (err: any) {
      console.error('Erro na extração da CNH:', err);
      setErrorMessage(
        'Ocorreu uma falha na comunicação com o serviço de extração. Verifique a conexão e tente novamente.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Capture snapshot from real-time video feed
  const handleCaptureFromVideo = () => {
    if (!videoRef.current) return;

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      setCapturedPreview(dataUrl);
      stopCameraStream();
      processDocumentPayload(dataUrl, 'image/jpeg', 'captura-cnh-camera.jpg');
    } catch (e) {
      console.error('Falha ao capturar frame do vídeo:', e);
      setErrorMessage('Falha ao capturar imagem da câmera. Tente novamente.');
    }
  };

  // Read file from file picker or camera input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setCapturedPreview(base64.startsWith('data:image') ? base64 : null);
      processDocumentPayload(base64, file.type || 'image/jpeg', file.name);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Support clipboard paste (Ctrl+V)
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result as string;
              setCapturedPreview(base64);
              setActiveTab('upload');
              stopCameraStream();
              processDocumentPayload(base64, blob.type, 'cnh-colada-clipboard.png');
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, stopCameraStream]);

  // Confirm and proceed to the driver registration form
  const handleConfirmAndFillForm = () => {
    if (!scanResult) return;
    onScanComplete(scanResult);
    onClose();
  };

  // Reset and scan again
  const handleResetScan = () => {
    setScanResult(null);
    setErrorMessage('');
    setCapturedPreview(null);
    if (activeTab === 'camera') {
      startCameraStream(facingMode);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="cnh-scanner-modal-backdrop"
      className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto"
    >
      <div
        id="cnh-scanner-modal-card"
        className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl text-slate-900 my-auto overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Escanear CNH do Motorista
                </h3>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3" /> IA & OCR
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Aponte a câmera para a CNH ou envie uma foto para preencher o cadastro automaticamente
              </p>
            </div>
          </div>
          <button
            id="btn-close-cnh-scanner"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection (only when not showing final result) */}
        {!scanResult && (
          <div className="px-5 pt-3 border-b border-slate-100 bg-white">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('camera');
                  setErrorMessage('');
                }}
                className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'camera'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Câmera ao Vivo (Celular / PC)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('upload');
                  stopCameraStream();
                  setErrorMessage('');
                }}
                className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Tirar Foto / Enviar Arquivo</span>
              </button>
            </div>
          </div>
        )}

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* 1. REVIEW / PREVIEW OF SCANNED DATA */}
          {scanResult ? (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-emerald-950">
                    CNH Escaneada com Sucesso!
                  </h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Os dados foram extraídos do documento. Confira as informações abaixo antes de preencher o formulário:
                  </p>
                </div>
              </div>

              {/* Data Card Breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5 text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                    Dados do Condutor
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[11px]">
                    <ShieldCheck className="w-3.5 h-3.5" /> Pronto para Cadastrar
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2 p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="block text-[11px] text-slate-400 font-medium">Nome Completo</span>
                    <span className="block text-sm font-bold text-slate-900 mt-0.5">
                      {scanResult.name || <span className="text-slate-400 italic">Não identificado</span>}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="block text-[11px] text-slate-400 font-medium">CPF</span>
                    <span className="block text-sm font-bold text-slate-900 mt-0.5 font-mono">
                      {scanResult.cpf ? formatCPF(scanResult.cpf) : <span className="text-slate-400 italic">Não identificado</span>}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="block text-[11px] text-slate-400 font-medium">Nº Registro da CNH</span>
                    <span className="block text-sm font-bold text-slate-900 mt-0.5 font-mono">
                      {scanResult.cnhNumber || <span className="text-slate-400 italic">Não identificado</span>}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="block text-[11px] text-slate-400 font-medium">Categoria CNH</span>
                    <span className="block text-sm font-bold text-blue-600 mt-0.5">
                      Categoria {scanResult.cnhCategory || 'B'}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-slate-200 rounded-xl">
                    <span className="block text-[11px] text-slate-400 font-medium">Data de Validade</span>
                    <span className="block text-sm font-bold text-slate-900 mt-0.5 font-mono">
                      {scanResult.cnhExpiration || <span className="text-slate-400 italic">Não informada</span>}
                    </span>
                  </div>

                  {scanResult.birthDate && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[11px] text-slate-400 font-medium">Data de Nascimento</span>
                      <span className="block text-sm font-bold text-slate-900 mt-0.5 font-mono">
                        {scanResult.birthDate}
                      </span>
                    </div>
                  )}

                  {scanResult.motherName && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[11px] text-slate-400 font-medium">Nome da Mãe</span>
                      <span className="block text-xs font-bold text-slate-900 mt-0.5">
                        {scanResult.motherName}
                      </span>
                    </div>
                  )}

                  {scanResult.fatherName && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[11px] text-slate-400 font-medium">Nome do Pai</span>
                      <span className="block text-xs font-bold text-slate-900 mt-0.5">
                        {scanResult.fatherName}
                      </span>
                    </div>
                  )}

                  {scanResult.renachNumber && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[11px] text-slate-400 font-medium">RENACH</span>
                      <span className="block text-xs font-bold text-slate-900 mt-0.5 font-mono">
                        {scanResult.renachNumber}
                      </span>
                    </div>
                  )}

                  {scanResult.cnhSecurityCode && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[11px] text-slate-400 font-medium">Cód. Segurança</span>
                      <span className="block text-xs font-bold text-slate-900 mt-0.5 font-mono">
                        {scanResult.cnhSecurityCode}
                      </span>
                    </div>
                  )}

                  {scanResult.firstLicenseDate && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[11px] text-slate-400 font-medium">1ª Habilitação</span>
                      <span className="block text-xs font-bold text-slate-900 mt-0.5 font-mono">
                        {scanResult.firstLicenseDate}
                      </span>
                    </div>
                  )}

                  {scanResult.cnhIssueDate && (
                    <div className="p-3 bg-white border border-slate-200 rounded-xl">
                      <span className="block text-[11px] text-slate-400 font-medium">Data de Emissão</span>
                      <span className="block text-xs font-bold text-slate-900 mt-0.5 font-mono">
                        {scanResult.cnhIssueDate}
                      </span>
                    </div>
                  )}

                  {scanResult.assignedVehiclePlate && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                      <span className="block text-[11px] text-blue-600 font-medium">Veículo Detectado</span>
                      <span className="block text-xs font-bold text-blue-900 mt-0.5 font-mono">
                        Placa: {scanResult.assignedVehiclePlate}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetScan}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Escanear Outro Documento</span>
                </button>

                <button
                  id="btn-confirm-cnh-scanned-data"
                  type="button"
                  onClick={handleConfirmAndFillForm}
                  className="w-full sm:flex-1 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Conferir no Cadastro de Motorista →</span>
                </button>
              </div>
            </div>
          ) : isProcessing ? (
            /* 2. PROCESSING STATE */
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-3xl bg-emerald-100 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-600 animate-pulse">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="absolute inset-0 rounded-3xl border-2 border-emerald-600 border-t-transparent animate-spin" />
              </div>

              <div className="max-w-md space-y-1">
                <h4 className="text-base font-bold text-slate-900">
                  Processando CNH do Condutor
                </h4>
                <p className="text-xs text-emerald-700 font-medium">
                  {processingStep || 'Lendo documento...'}
                </p>
                <p className="text-[11px] text-slate-400 mt-2">
                  Identificando Nome, CPF, Registro, Categoria, Validade e Filiação com Inteligência Artificial
                </p>
              </div>
            </div>
          ) : (
            /* 3. CAPTURE / UPLOAD STATE */
            <div className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">{errorMessage}</p>
                    <p className="mt-1 text-slate-600 text-[11px]">
                      Dica: Para melhor reconhecimento, posicione a CNH em um fundo plano e com boa iluminação, evitando sombras e reflexos.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'camera' ? (
                /* LIVE CAMERA VIEW */
                <div className="space-y-3">
                  {cameraError ? (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="font-bold">Câmera Indisponível</span>
                      </div>
                      <p>{cameraError}</p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('upload')}
                        className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors cursor-pointer"
                      >
                        Usar Envio de Foto / Arquivo
                      </button>
                    </div>
                  ) : (
                    <div className="relative w-full aspect-4/3 sm:aspect-16/10 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        className="w-full h-full object-cover"
                      />

                      {/* Document Framing Guidelines Overlay */}
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4">
                        <div className="relative w-[88%] aspect-16/10 border-2 border-dashed border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.45)]">
                          {/* Corner Markers */}
                          <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-sm" />
                          <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-sm" />
                          <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-sm" />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-sm" />

                          {/* Glowing Animated Scan Laser */}
                          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse top-1/2 -translate-y-1/2" />

                          {/* Text Guide */}
                          <div className="absolute -bottom-7 inset-x-0 text-center">
                            <span className="bg-slate-900/85 text-emerald-300 text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                              Enquadre a CNH dentro deste retângulo
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Controls on Top of Camera */}
                      {hasMultipleCameras && (
                        <button
                          type="button"
                          onClick={handleToggleCamera}
                          className="absolute top-3 right-3 p-2 rounded-xl bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-xs transition-colors cursor-pointer"
                          title="Alternar Câmera Frontal / Traseira"
                        >
                          <SwitchCamera className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Camera Action Buttons */}
                  {!cameraError && (
                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                      <button
                        id="btn-capture-cnh-video"
                        type="button"
                        onClick={handleCaptureFromVideo}
                        disabled={!isCameraActive}
                        className="w-full py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span>Capturar e Ler CNH</span>
                      </button>

                      {/* Mobile Native Camera shortcut */}
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="w-full sm:w-auto py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                        title="Tirar foto usando o aplicativo nativo da câmera do celular"
                      >
                        <Zap className="w-4 h-4 text-emerald-600" />
                        <span className="sm:hidden">Foto Nativa do Celular</span>
                        <span className="hidden sm:inline">Foto com Câmera Nativa</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* UPLOAD / CELLPHONE PHOTO MODE */
                <div className="space-y-4">
                  {/* Big Button for Smartphones: Take photo directly using native phone camera */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Camera className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">
                          Tirar Foto com a Câmera do Celular
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Abre a câmera do smartphone para capturar foto nítida da CNH
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Abrir Câmera do Celular</span>
                    </button>
                  </div>

                  {/* Drag and Drop / Choose File */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl bg-slate-50/50 hover:bg-emerald-50/20 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Clique para selecionar arquivo de CNH ou arraste aqui
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Formatos aceitos: Imagem (JPG, PNG, WEBP) ou PDF da CNH Digital
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      Você também pode colar uma imagem da CNH com Ctrl+V
                    </span>
                  </div>

                  {/* Captured Thumbnail Preview if exists */}
                  {capturedPreview && (
                    <div className="p-3 bg-slate-100 rounded-xl flex items-center gap-3">
                      <img
                        src={capturedPreview}
                        alt="Preview CNH"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-300"
                      />
                      <div className="flex-1 text-xs">
                        <span className="font-semibold text-slate-800 block">Imagem Selecionada</span>
                        <span className="text-[11px] text-slate-500">Pronta para reprocessamento</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Hidden Inputs */}
              {/* Native smartphone camera capture */}
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Gallery / File picker */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Modal Footer Info */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Processamento seguro e compatível com CNH Digital e Impressa
          </span>
          <span className="font-semibold text-slate-600 hidden sm:inline">
            SENATRAN / DETRAN
          </span>
        </div>
      </div>
    </div>
  );
};
